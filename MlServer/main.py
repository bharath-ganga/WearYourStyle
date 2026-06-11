"""
WearYourStyle — ML Server  (main.py)
=====================================
Virtual Try-On Pipeline — Fully Upgraded

Layer 1  ─ Core fixes
  • Body segmentation  (MediaPipe selfie_multiclass_256x256)
  • Arm occlusion mask  (arms appear in front of garment)
  • Perspective-aware scaling  (shoulder width + torso height)

Layer 1+ ─ Cloth realism
  • TPS cloth warping via scipy RBFInterpolator (8 control points)
  • Affine fallback when scipy is unavailable

Layer 2  ─ High-quality mode
  • HR-VITON inference wrapper (loads if weights/ folder present)
  • Enhanced fast pipeline fallback when weights are missing
  • New Socket.IO event  frame_hq  →  frame_processed_hq
  • REST endpoint  POST /tryon/photo  for static photo mode

Layer 3  ─ Infrastructure
  • Improved size estimation (shoulder px + user height calibration)
  • All models loaded at startup — zero per-request loading

Preserved events (unchanged): connect, disconnect, update_garment,
  update_accessory, process_frame, frame_processed, no_fit, error
"""

import os
import sys
import io
import base64
import threading
import time

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests

# Optional heavy deps — graceful degradation if absent
try:
    from scipy.interpolate import RBFInterpolator
    _SCIPY = True
except ImportError:
    _SCIPY = False
    print("[WARN] scipy not found — TPS warping disabled, using affine fallback", flush=True)

try:
    from PIL import Image as _PILImage
    _PIL = True
except ImportError:
    _PIL = False

# ═══════════════════════════════════════════════════════════════
#  App + SocketIO
# ═══════════════════════════════════════════════════════════════
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    max_http_buffer_size=10 ** 7,
    async_mode="eventlet",
)

# Session-keyed caches (Socket session ID → data)
garment_cache: dict   = {}
accessory_cache: dict = {}
_cache_lock = threading.Lock()

# ═══════════════════════════════════════════════════════════════
#  Paths
# ═══════════════════════════════════════════════════════════════
MODEL_DIR       = os.path.dirname(os.path.abspath(__file__))
POSE_MODEL      = os.path.join(MODEL_DIR, "pose_landmarker.task")
CLASSIFIER_PATH = os.path.join(MODEL_DIR, "classifier.tflite")
SEG_MODEL       = os.path.join(MODEL_DIR, "selfie_multiclass_256x256.tflite")
HRVITON_DIR     = os.path.join(MODEL_DIR, "weights", "hr_viton")
UPLOADS_DIR     = os.path.join(MODEL_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
#  Auto-download helper
# ═══════════════════════════════════════════════════════════════
def _download(url: str, dest: str) -> bool:
    """Download a file and save to dest. Returns True on success."""
    try:
        print(f"  ↓ Downloading {os.path.basename(dest)} …", flush=True)
        r = requests.get(url, stream=True, timeout=120)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  ✓ Saved {os.path.basename(dest)}", flush=True)
        return True
    except Exception as e:
        print(f"  ✗ Download failed: {e}", flush=True)
        return False


# ── Classifier (EfficientNet Lite0) ─────────────────────────────
if not os.path.exists(CLASSIFIER_PATH):
    _download(
        "https://storage.googleapis.com/mediapipe-models/image_classifier/"
        "efficientnet_lite0/float32/1/efficientnet_lite0.tflite",
        CLASSIFIER_PATH,
    )

# ── Selfie multiclass segmenter ──────────────────────────────────
if not os.path.exists(SEG_MODEL):
    _download(
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/"
        "selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
        SEG_MODEL,
    )

# ═══════════════════════════════════════════════════════════════
#  Model loading — all at startup
# ═══════════════════════════════════════════════════════════════

# ── Pose Landmarker ─────────────────────────────────────────────
print("Loading Pose Landmarker …", flush=True)
_pose_opts = vision.PoseLandmarkerOptions(
    base_options=python.BaseOptions(model_asset_path=POSE_MODEL),
    output_segmentation_masks=False,
)
detector = vision.PoseLandmarker.create_from_options(_pose_opts)
print("✓ Pose Landmarker ready", flush=True)

# ── Body Segmenter ──────────────────────────────────────────────
_segmenter = None
if os.path.exists(SEG_MODEL):
    try:
        print("Loading Body Segmenter …", flush=True)
        _seg_opts = vision.ImageSegmenterOptions(
            base_options=python.BaseOptions(model_asset_path=SEG_MODEL),
            output_category_mask=True,
        )
        _segmenter = vision.ImageSegmenter.create_from_options(_seg_opts)
        print("✓ Body Segmenter ready", flush=True)
    except Exception as e:
        print(f"⚠ Body Segmenter unavailable: {e}", flush=True)
else:
    print("⚠ Segmenter model not found — body clipping disabled", flush=True)

# ── Image Classifier ────────────────────────────────────────────
print("Loading Image Classifier …", flush=True)
_cls_opts = vision.ImageClassifierOptions(
    base_options=python.BaseOptions(model_asset_path=CLASSIFIER_PATH),
    max_results=5,
)
classifier = vision.ImageClassifier.create_from_options(_cls_opts)
print("✓ Image Classifier ready", flush=True)

# ── Haar Cascades ───────────────────────────────────────────────
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
eye_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye.xml"
)

# ── Accessory images ────────────────────────────────────────────
def _load_asset(name: str):
    p = os.path.join(MODEL_DIR, "assets", f"{name}.png")
    img = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"⚠ Asset not found: {p}", flush=True)
    return img


accessories_dict = {
    "sunglasses": _load_asset("sunglasses"),
    "hat":        _load_asset("hat"),
    "crown":      _load_asset("crown"),
}

# ═══════════════════════════════════════════════════════════════
#  HR-VITON — optional high-quality model
# ═══════════════════════════════════════════════════════════════
class HRVITONInference:
    """
    Wrapper for HR-VITON photorealistic virtual try-on.

    To activate full HR-VITON:
      1. Download weights into  MlServer/weights/hr_viton/
            gen.pth  (~330 MB)   ←  condition generator
            seg.pth  (~50  MB)   ←  segmentation network
         Source: https://github.com/sangyun884/HR-VITON  (Google Drive link in README)

      2. Clone the HR-VITON repo into  MlServer/hr_viton_src/
            git clone https://github.com/sangyun884/HR-VITON MlServer/hr_viton_src

      3. Install PyTorch:  pip install torch torchvision

      4. Uncomment the model-loading code in _try_load() below.

    Until then, the HQ Socket.IO event uses the enhanced fast pipeline.
    """

    def __init__(self):
        self.available = False
        self.device = None
        self._try_load()

    def _try_load(self):
        gen_path = os.path.join(HRVITON_DIR, "gen.pth")
        seg_path = os.path.join(HRVITON_DIR, "seg.pth")

        if not (os.path.exists(gen_path) and os.path.exists(seg_path)):
            print(
                "⚠ HR-VITON weights not found at MlServer/weights/hr_viton/ "
                "— HQ mode uses enhanced fast pipeline",
                flush=True,
            )
            return

        try:
            import torch

            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            print(f"  Loading HR-VITON on {self.device} …", flush=True)

            # ─────────────────────────────────────────────────────────────────
            # Uncomment and adapt after cloning the HR-VITON repo:
            #
            #   src_dir = os.path.join(MODEL_DIR, "hr_viton_src")
            #   sys.path.insert(0, src_dir)
            #   from networks import ConditionGenerator, SPADEGenerator, load_checkpoint
            #
            #   self.seg_model = ConditionGenerator(
            #       opt, input1_nc=4, input2_nc=3, output_nc=13, ngf=96, norm_layer=nn.BatchNorm2d
            #   ).to(self.device)
            #   load_checkpoint(self.seg_model, seg_path)
            #   self.seg_model.eval()
            #
            #   self.gen_model = SPADEGenerator(opt).to(self.device)
            #   load_checkpoint(self.gen_model, gen_path)
            #   self.gen_model.eval()
            # ─────────────────────────────────────────────────────────────────

            self.available = True
            print(
                "✓ HR-VITON weights found — uncomment model code in HRVITONInference._try_load() to activate",
                flush=True,
            )
        except ImportError:
            print("⚠ torch not installed — HQ mode uses enhanced fast pipeline", flush=True)
        except Exception as e:
            print(f"⚠ HR-VITON load error: {e}", flush=True)

    def run(self, person_bgr: np.ndarray, garment_bgra: np.ndarray) -> np.ndarray:
        """
        Run HR-VITON inference.
        Returns BGR composite image.
        Raises RuntimeError / NotImplementedError to trigger enhanced fast fallback.
        """
        if not self.available:
            raise RuntimeError("HR-VITON not initialized")
        # Activate after wiring the model (see _try_load comments):
        raise NotImplementedError(
            "Uncomment HR-VITON model code in _try_load() to enable full HQ inference"
        )


hrviton = HRVITONInference()
print("✓ All models initialized — server ready\n", flush=True)

# ═══════════════════════════════════════════════════════════════
#  Utility — color name
# ═══════════════════════════════════════════════════════════════
def get_color_name(hsv) -> str:
    h, s, v = hsv
    if v < 40:               return "Black"
    if v > 200 and s < 40:  return "White"
    if s < 40:               return "Gray"
    if h < 10 or h > 170:   return "Red"
    if 10  <= h < 25:        return "Orange"
    if 25  <= h < 35:        return "Yellow"
    if 35  <= h < 85:        return "Green"
    if 85  <= h < 130:       return "Blue"
    if 130 <= h < 170:       return "Purple"
    return "Unknown"

# ═══════════════════════════════════════════════════════════════
#  Layer 1 — Body Segmentation
# ═══════════════════════════════════════════════════════════════
def segment_body(frame_rgb: np.ndarray) -> np.ndarray:
    """
    Returns uint8 mask (H×W): 255 = person, 0 = background.
    Uses MediaPipe selfie_multiclass segmenter (6 classes):
      0 = background, 1 = hair, 2 = body-skin, 3 = face-skin,
      4 = clothes, 5 = accessories
    Falls back to a full-frame mask when the segmenter is unavailable.
    """
    if _segmenter is None:
        # No segmenter — return all-person mask (no clipping)
        return np.full(frame_rgb.shape[:2], 255, dtype=np.uint8)

    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    result = _segmenter.segment(mp_img)

    if result.category_mask is None:
        return np.full(frame_rgb.shape[:2], 255, dtype=np.uint8)

    cat = result.category_mask.numpy_view()          # H×W, values 0-5
    mask = np.where(cat > 0, 255, 0).astype(np.uint8)  # any non-background = person

    # Morphological cleanup: close holes, smooth edges
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
    mask = cv2.GaussianBlur(mask, (11, 11), 0)
    _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    return mask

# ═══════════════════════════════════════════════════════════════
#  Layer 1 — Arm Occlusion Mask
# ═══════════════════════════════════════════════════════════════
#  MediaPipe pose landmark indices used for arms
#  Left side:  11 shoulder, 13 elbow, 15 wrist, 17 pinky, 19 index, 21 thumb
#  Right side: 12 shoulder, 14 elbow, 16 wrist, 18 pinky, 20 index, 22 thumb

def build_arm_occlusion_mask(landmarks, h: int, w: int) -> np.ndarray:
    """
    Creates a binary mask (uint8, 255 = arm region) covering both forearms
    from elbow to fingertips.  These pixels are pasted OVER the garment
    so the arms appear naturally in front of the clothing.
    """
    mask = np.zeros((h, w), dtype=np.uint8)

    def get_pt(idx):
        lm = landmarks[idx]
        if lm.visibility < 0.25:
            return None
        return (int(lm.x * w), int(lm.y * h))

    def draw_limb_strip(pts, half_w=22):
        """Draw a thick rounded strip through a list of (x, y) points."""
        valid = [p for p in pts if p is not None]
        if len(valid) < 2:
            return
        for i in range(len(valid) - 1):
            p1 = np.array(valid[i],     dtype=np.float32)
            p2 = np.array(valid[i + 1], dtype=np.float32)
            seg = p2 - p1
            length = np.linalg.norm(seg)
            if length < 1:
                continue
            perp = np.array([-seg[1], seg[0]], dtype=np.float32) / length * half_w
            quad = np.array(
                [p1 + perp, p1 - perp, p2 - perp, p2 + perp], dtype=np.int32
            )
            cv2.fillConvexPoly(mask, quad, 255)
            # Rounded caps
            cv2.circle(mask, (int(p1[0]), int(p1[1])), half_w, 255, -1)
            cv2.circle(mask, (int(p2[0]), int(p2[1])), half_w, 255, -1)

    # Left forearm + hand
    draw_limb_strip(
        [get_pt(13), get_pt(15), get_pt(17), get_pt(19)],
        half_w=26,
    )
    # Right forearm + hand
    draw_limb_strip(
        [get_pt(14), get_pt(16), get_pt(18), get_pt(20)],
        half_w=26,
    )

    # Dilate slightly to cover any edge bleed from the garment
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    mask = cv2.dilate(mask, k, iterations=1)
    return mask

# ═══════════════════════════════════════════════════════════════
#  Layer 1+ — TPS Cloth Warping  (scipy RBFInterpolator)
# ═══════════════════════════════════════════════════════════════
def _tps_warp(
    garment: np.ndarray,
    src_pts: np.ndarray,
    dst_pts: np.ndarray,
    out_h: int,
    out_w: int,
) -> np.ndarray | None:
    """
    Warp garment from src_pts layout to dst_pts layout using
    Thin-Plate Spline (scipy RBFInterpolator, kernel='thin_plate_spline').

    Builds an inverse map: for each output pixel → find garment pixel.
    Returns a warped image of shape (out_h, out_w, C), or None on failure.
    """
    if not _SCIPY or len(src_pts) < 4:
        return None

    try:
        # Inverse map: dst_pts → src_pts
        rbf = RBFInterpolator(
            dst_pts, src_pts,
            kernel="thin_plate_spline",
            smoothing=0.5,
        )

        # Dense output grid  [out_h × out_w, 2]
        yy, xx = np.mgrid[0:out_h, 0:out_w]
        out_coords = np.column_stack([xx.ravel(), yy.ravel()]).astype(np.float64)

        src_coords = rbf(out_coords).astype(np.float32)
        map_x = src_coords[:, 0].reshape(out_h, out_w)
        map_y = src_coords[:, 1].reshape(out_h, out_w)

        warped = cv2.remap(
            garment, map_x, map_y,
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0),
        )
        return warped
    except Exception as e:
        print(f"[WARN] TPS warp failed: {e}", flush=True)
        return None


def warp_garment_to_body(
    garment: np.ndarray,
    landmarks,
    h: int,
    w: int,
) -> np.ndarray | None:
    """
    Perspective-aware garment warping using 8 control points.

    Control point mapping (garment → body):
      collar-center  → neck point  (shoulders midpoint + small upward offset)
      collar-left    → left shoulder  (scaled outward)
      collar-right   → right shoulder (scaled outward)
      mid-left       → 60% down torso, left side
      mid-right      → 60% down torso, right side
      hem-left       → left hip  (scaled below hip)
      hem-right      → right hip (scaled below hip)
      hem-center     → mid-hip

    Uses TPS when scipy is available, affine transform as fallback.
    Returns a BGRA image of size (h, w), or None if landmarks are invalid.
    """
    sh, sw = garment.shape[:2]

    def lm_px(i):
        lm = landmarks[i]
        return np.array([lm.x * w, lm.y * h], dtype=np.float32)

    ls = lm_px(11)   # left shoulder
    rs = lm_px(12)   # right shoulder
    lh = lm_px(23)   # left hip
    rh = lm_px(24)   # right hip

    neck     = (ls + rs) * 0.5
    mid_hip  = (lh + rh) * 0.5
    torso_v  = mid_hip - neck               # vector pointing down the torso
    torso_h  = np.linalg.norm(torso_v)
    shdr_w   = np.linalg.norm(ls - rs)

    if shdr_w < 8 or torso_h < 8:
        return None

    up_unit = -torso_v / torso_h            # unit vector pointing up (toward head)

    # Place collar slightly above shoulder midpoint
    collar_offset = up_unit * (torso_h * 0.07)

    # Spread shoulders outward by ~35% for natural garment width
    WING = 1.35
    TORSO_SCALE = 1.18   # hem extends 18% below hip

    neck_pt     = neck    + collar_offset
    left_outer  = neck    + (ls - neck) * WING + collar_offset
    right_outer = neck    + (rs - neck) * WING + collar_offset
    mid_left    = neck    + torso_v * 0.58 + (ls - neck) * 0.80
    mid_right   = neck    + torso_v * 0.58 + (rs - neck) * 0.80
    hem_left    = neck    + torso_v * TORSO_SCALE + (ls - neck) * 0.88
    hem_right   = neck    + torso_v * TORSO_SCALE + (rs - neck) * 0.88
    hem_center  = neck    + torso_v * TORSO_SCALE

    src_pts = np.array(
        [
            [sw * 0.50, sh * 0.02],   # collar center
            [sw * 0.20, sh * 0.02],   # collar left
            [sw * 0.80, sh * 0.02],   # collar right
            [sw * 0.07, sh * 0.47],   # mid left
            [sw * 0.93, sh * 0.47],   # mid right
            [sw * 0.10, sh * 0.97],   # hem left
            [sw * 0.90, sh * 0.97],   # hem right
            [sw * 0.50, sh * 0.97],   # hem center
        ],
        dtype=np.float32,
    )

    dst_pts = np.array(
        [neck_pt, left_outer, right_outer, mid_left, mid_right,
         hem_left, hem_right, hem_center],
        dtype=np.float32,
    )

    # Attempt TPS warp
    warped = _tps_warp(garment, src_pts, dst_pts, h, w)
    if warped is not None:
        return warped

    # Affine fallback (3 anchor points)
    M = cv2.getAffineTransform(
        src_pts[[0, 1, 5], :],
        dst_pts[[0, 1, 5], :],
    )
    warped = cv2.warpAffine(
        garment, M, (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    return warped

# ═══════════════════════════════════════════════════════════════
#  Layer 3 — Size Estimation
# ═══════════════════════════════════════════════════════════════
def estimate_size(
    shoulder_px: float,
    frame_width: int,
    user_height_cm: float = 175.0,
) -> str:
    """
    Estimates clothing size from pixel shoulder width.

    Calibration: a person of height H cm fills roughly 27% of the
    frame width as shoulder span at 1 metre from a standard webcam.
    Standard adult shoulder widths: XS <37 cm, S 37-40, M 40-44, L 44-48, XL >48.
    """
    shoulder_cm = (shoulder_px / frame_width) * user_height_cm * 0.27
    if   shoulder_cm < 37: return "XS"
    elif shoulder_cm < 40: return "S"
    elif shoulder_cm < 44: return "M"
    elif shoulder_cm < 48: return "L"
    else:                  return "XL"

# ═══════════════════════════════════════════════════════════════
#  Core compositing helpers
# ═══════════════════════════════════════════════════════════════
def overlay_png(
    background: np.ndarray,
    overlay: np.ndarray,
    position: tuple,
) -> np.ndarray:
    """Alpha-composite overlay onto background at (x, y) = position."""
    bg_h, bg_w = background.shape[:2]
    ov_h, ov_w = overlay.shape[:2]
    x, y = position

    ov_x1 = max(0, -x);  ov_y1 = max(0, -y)
    bg_x1 = max(0,  x);  bg_y1 = max(0,  y)
    ov_x2 = min(ov_w, bg_w - x)
    ov_y2 = min(ov_h, bg_h - y)

    if ov_x2 <= ov_x1 or ov_y2 <= ov_y1:
        return background

    ov_vis = overlay[ov_y1:ov_y2, ov_x1:ov_x2]
    bg_roi = background[bg_y1:bg_y1 + (ov_y2 - ov_y1),
                        bg_x1:bg_x1 + (ov_x2 - ov_x1)]

    if ov_vis.shape[2] == 4:
        alpha = ov_vis[:, :, 3:4].astype(np.float32) / 255.0
        bg_roi[:] = (alpha * ov_vis[:, :, :3] + (1.0 - alpha) * bg_roi).astype(np.uint8)
    else:
        bg_roi[:] = ov_vis[:, :, :3]

    return background


def crop_to_content(image: np.ndarray) -> np.ndarray:
    """Crop image to its non-transparent bounding box."""
    if image.ndim == 3 and image.shape[2] == 4:
        alpha = image[:, :, 3]
        coords = cv2.findNonZero(alpha)
        if coords is not None:
            x, y, ww, hh = cv2.boundingRect(coords)
            return image[y:y + hh, x:x + ww]
    return image


def remove_background(image: np.ndarray) -> np.ndarray:
    """
    Flood-fill background removal for product images with solid/white backgrounds.
    Samples corners and edge midpoints to handle non-white uniform backgrounds.
    Falls back immediately if the image already has transparency.
    """
    if image.ndim == 3 and image.shape[2] == 3:
        b, g, r = cv2.split(image)
        alpha = np.full(b.shape, 255, dtype=np.uint8)
        image = cv2.merge((b, g, r, alpha))

    # Already has transparent pixels — nothing to do
    if np.min(image[:, :, 3]) < 255:
        return image

    h, w = image.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    fill_img = image[:, :, :3].copy()
    diff  = (20, 20, 20)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY

    # Sample corners + edge midpoints
    seed_pts = [
        (0, 0),    (w - 1, 0),    (0, h - 1),  (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
    ]
    for pt in seed_pts:
        cv2.floodFill(fill_img, mask, pt, 0, diff, diff, flags)

    bg_mask = mask[1:h + 1, 1:w + 1]
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    bg_mask = cv2.dilate(bg_mask, k, iterations=1)
    image[:, :, 3] = np.where(bg_mask == 1, 0, image[:, :, 3]).astype(np.uint8)
    return image


def _apply_garment_composite(
    frame: np.ndarray,
    warped_garment: np.ndarray,
    body_mask: np.ndarray,
    arm_mask: np.ndarray,
) -> np.ndarray:
    """
    Three-pass composite:
      1. Alpha-blend warped garment onto frame
      2. Clip garment to body silhouette (prevents bleed outside person)
      3. Restore original arm pixels over garment (arm occlusion)
    """
    h, w = frame.shape[:2]

    garment_alpha = (
        warped_garment[:, :, 3].astype(np.float32) / 255.0
        if warped_garment.shape[2] == 4
        else np.ones((h, w), dtype=np.float32)
    )

    # Clip by body mask
    body_f = body_mask.astype(np.float32) / 255.0
    clipped = garment_alpha * body_f  # [0.0 – 1.0]

    garment_bgr = warped_garment[:, :, :3].astype(np.float32)
    frame_f     = frame.astype(np.float32)
    a3          = clipped[:, :, np.newaxis]

    blended = (garment_bgr * a3 + frame_f * (1.0 - a3)).astype(np.uint8)

    # Paste original arm pixels on top
    arm_bool = arm_mask > 0
    blended[arm_bool] = frame[arm_bool]

    return blended


def overlay_accessory_on_frame(
    frame: np.ndarray,
    accessory_type: str,
    landmarks,
) -> np.ndarray:
    """Place an accessory image on the frame using eye landmark positions."""
    acc = accessories_dict.get(accessory_type)
    if acc is None:
        return frame

    h, w = frame.shape[:2]
    le_x = int(landmarks[2].x * w);  le_y = int(landmarks[2].y * h)
    re_x = int(landmarks[5].x * w);  re_y = int(landmarks[5].y * h)

    eye_dist = float(np.hypot(le_x - re_x, le_y - re_y))
    if eye_dist <= 0:
        return frame

    angle = float(np.degrees(np.arctan2(le_y - re_y, le_x - re_x)))

    def _place(cx, cy, sw, sh):
        resized  = cv2.resize(acc, (sw, sh), interpolation=cv2.INTER_LINEAR)
        M        = cv2.getRotationMatrix2D((sw / 2, sh / 2), angle, 1.0)
        rotated  = cv2.warpAffine(
            resized, M, (sw, sh),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0,) * 4,
        )
        return overlay_png(frame, rotated, (cx - sw // 2, cy - sh // 2))

    if accessory_type == "sunglasses":
        sw = int(eye_dist * 2.5)
        sh = int(sw * acc.shape[0] / acc.shape[1])
        frame = _place((le_x + re_x) // 2, (le_y + re_y) // 2, sw, sh)
    else:
        sw = int(eye_dist * (3.2 if accessory_type == "hat" else 2.2))
        sh = int(sw * acc.shape[0] / acc.shape[1])
        cy = (le_y + re_y) // 2 - int(eye_dist * 1.3)
        frame = _place((le_x + re_x) // 2, cy, sw, sh)

    return frame

# ═══════════════════════════════════════════════════════════════
#  Processing pipelines
# ═══════════════════════════════════════════════════════════════
def _run_fast_pipeline(
    frame_bgr: np.ndarray,
    shirt_bgra: np.ndarray | None,
    active_accessory: str | None,
    user_height_cm: float = 175.0,
) -> tuple[np.ndarray, str, str]:
    """
    Full fast pipeline (Layer 1 + TPS).
    Returns (output_bgr, detected_size, feedback_message).
    feedback_message is non-empty when the user cannot be detected.
    """
    h, w = frame_bgr.shape[:2]
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    mp_img    = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

    # Body segmentation (Layer 1)
    body_mask = segment_body(frame_rgb)

    # Pose detection
    pose_result = detector.detect(mp_img)

    if not pose_result.pose_landmarks:
        # Return the original frame — client should get a frame update regardless
        return frame_bgr.copy(), "Unknown", "Person not found"

    landmarks = pose_result.pose_landmarks[0]

    ls_px = np.array([landmarks[11].x * w, landmarks[11].y * h])
    rs_px = np.array([landmarks[12].x * w, landmarks[12].y * h])
    lh_px = np.array([landmarks[23].x * w, landmarks[23].y * h])
    rh_px = np.array([landmarks[24].x * w, landmarks[24].y * h])

    shoulder_w = float(np.linalg.norm(ls_px - rs_px))
    neck_px    = (ls_px + rs_px) / 2.0
    hip_px     = (lh_px + rh_px) / 2.0
    torso_h    = float(np.linalg.norm(neck_px - hip_px))

    if shoulder_w < 8 or torso_h < 8:
        return frame_bgr.copy(), "Unknown", "Stand back for detection"

    # Size estimation (Layer 3)
    detected_size = estimate_size(shoulder_w, w, user_height_cm)

    output = frame_bgr.copy()

    # Garment warping + compositing
    if shirt_bgra is not None:
        cropped = crop_to_content(shirt_bgra)
        warped  = warp_garment_to_body(cropped, landmarks, h, w)

        if warped is not None:
            arm_mask = build_arm_occlusion_mask(landmarks, h, w)   # Layer 1
            output   = _apply_garment_composite(output, warped, body_mask, arm_mask)

    # Accessories
    if active_accessory:
        output = overlay_accessory_on_frame(output, active_accessory, landmarks)

    return output, detected_size, ""


def _run_hq_pipeline(
    frame_bgr: np.ndarray,
    shirt_bgra: np.ndarray,
    user_height_cm: float = 175.0,
) -> tuple[np.ndarray, str]:
    """
    High-quality pipeline.
    Tries HR-VITON first; falls back to enhanced fast pipeline.
    Returns (output_bgr, detected_size).
    """
    if hrviton.available:
        try:
            garment_bgr = (
                shirt_bgra[:, :, :3]
                if shirt_bgra.ndim == 3 and shirt_bgra.shape[2] == 4
                else shirt_bgra
            )
            result_bgr = hrviton.run(frame_bgr, garment_bgr)
            # HR-VITON doesn't return landmarks — estimate size separately
            result_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            mp_img     = mp.Image(image_format=mp.ImageFormat.SRGB, data=result_rgb)
            pose       = detector.detect(mp_img)
            size       = "M"
            if pose.pose_landmarks:
                lms   = pose.pose_landmarks[0]
                sw_px = float(np.linalg.norm(
                    np.array([lms[11].x - lms[12].x]) * frame_bgr.shape[1]
                ))
                size  = estimate_size(sw_px, frame_bgr.shape[1], user_height_cm)
            return result_bgr, size
        except Exception as e:
            print(f"[INFO] HR-VITON fallback triggered: {e}", flush=True)

    # Enhanced fast pipeline fallback
    result, size, _ = _run_fast_pipeline(frame_bgr, shirt_bgra, None, user_height_cm)
    return result, size

# ═══════════════════════════════════════════════════════════════
#  Flask REST — Status check
# ═══════════════════════════════════════════════════════════════
@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "running", "message": "WearYourStyle ML Server is running"})

# ═══════════════════════════════════════════════════════════════
#  Flask REST — /classify
# ═══════════════════════════════════════════════════════════════
@app.route("/classify", methods=["POST"])
def classify_image():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400

        np_arr = np.frombuffer(request.files["image"].read(), np.uint8)
        img    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        mp_img     = mp.Image(image_format=mp.ImageFormat.SRGB,
                              data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        cls_result = classifier.classify(mp_img)

        top_cat, confidence = "Clothing", 0.0
        clothing_kw = ["jersey", "t-shirt", "shirt", "gown", "jean", "skirt", "suit"]
        if cls_result.classifications:
            cats = cls_result.classifications[0].categories
            for cat in cats:
                if any(kw in cat.category_name.lower() for kw in clothing_kw):
                    top_cat    = cat.category_name.split(",")[0].capitalize()
                    confidence = cat.score
                    break
            if top_cat == "Clothing" and cats:
                top_cat    = cats[0].category_name.split(",")[0].capitalize()
                confidence = cats[0].score

        h_i, w_i = img.shape[:2]
        roi     = img[h_i // 3:2 * h_i // 3, w_i // 3:2 * w_i // 3]
        avg_bgr = np.mean(roi, axis=(0, 1))
        hsv     = cv2.cvtColor(np.uint8([[avg_bgr]]), cv2.COLOR_BGR2HSV)[0][0]

        return jsonify({
            "type":       top_cat,
            "color":      get_color_name(hsv),
            "confidence": float(confidence),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════════════════════════════
#  Flask REST — POST /tryon/photo  (Layer 3 — static photo mode)
# ═══════════════════════════════════════════════════════════════
@app.route("/tryon/photo", methods=["POST"])
def tryon_photo():
    """
    Static-photo try-on endpoint (for mobile / upload mode).

    JSON body:
      {
        "frame"           : "<base64 PNG or JPEG of person>",
        "shirt"           : "<base64 PNG of garment>",
        "user_height_cm"  : 175,          // optional, default 175
        "hq"              : true           // optional, default true
      }

    Response:
      {
        "result"        : "<base64 JPEG composite>",
        "detected_size" : "M"
      }
    """
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        if "frame" not in data or "shirt" not in data:
            return jsonify({"error": "Missing 'frame' or 'shirt' field"}), 400

        # Decode person frame
        frame_bytes = base64.b64decode(data["frame"])
        frame_bgr   = cv2.imdecode(
            np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR
        )
        if frame_bgr is None:
            return jsonify({"error": "Invalid frame image"}), 400

        # Decode garment
        shirt_bytes = base64.b64decode(data["shirt"])
        shirt_bgra  = cv2.imdecode(
            np.frombuffer(shirt_bytes, np.uint8), cv2.IMREAD_UNCHANGED
        )
        if shirt_bgra is None:
            return jsonify({"error": "Invalid shirt image"}), 400

        # Ensure garment is BGRA and strip background
        shirt_bgra = remove_background(shirt_bgra)
        shirt_bgra = crop_to_content(shirt_bgra)

        user_height_cm = float(data.get("user_height_cm", 175))
        use_hq         = bool(data.get("hq", True))

        if use_hq:
            result_bgr, detected_size = _run_hq_pipeline(
                frame_bgr, shirt_bgra, user_height_cm
            )
        else:
            result_bgr, detected_size, _ = _run_fast_pipeline(
                frame_bgr, shirt_bgra, None, user_height_cm
            )

        _, buf    = cv2.imencode(".jpg", result_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        result_b64 = base64.b64encode(buf).decode("utf-8")

        return jsonify({"result": result_b64, "detected_size": detected_size})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════════════════════════════
#  Socket.IO — Garment & Accessory cache events (PRESERVED)
# ═══════════════════════════════════════════════════════════════
@socketio.on("update_garment")
def update_garment(data):
    try:
        shirt_bytes = base64.b64decode(data["shirt"])
        shirt = cv2.imdecode(np.frombuffer(shirt_bytes, np.uint8), cv2.IMREAD_UNCHANGED)
        if shirt is None:
            emit("error", {"message": "Invalid shirt data"})
            return
        shirt = remove_background(shirt)
        with _cache_lock:
            garment_cache[request.sid] = shirt
        emit("garment_updated", {"status": "success"})
    except Exception as e:
        emit("error", {"message": f"Garment update failed: {str(e)}"})


@socketio.on("update_accessory")
def update_accessory(data):
    try:
        acc_type = data.get("accessory")
        if acc_type == "none":
            acc_type = None
        if acc_type not in [None, "sunglasses", "hat", "crown"]:
            emit("error", {"message": "Invalid accessory type"})
            return
        with _cache_lock:
            accessory_cache[request.sid] = acc_type
        emit("accessory_updated", {"status": "success", "accessory": acc_type})
    except Exception as e:
        emit("error", {"message": f"Accessory update failed: {str(e)}"})


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    with _cache_lock:
        garment_cache.pop(sid, None)
        accessory_cache.pop(sid, None)

# ═══════════════════════════════════════════════════════════════
#  Socket.IO — process_frame  (PRESERVED, upgraded with Layer 1+)
# ═══════════════════════════════════════════════════════════════
@socketio.on("process_frame")
def process_frame(data):
    """
    Fast preview event (real-time, ~100 ms target).
    Upgraded with: body segmentation, arm occlusion, TPS warp, improved size.
    Emits: frame_processed | no_fit | error  (unchanged contract)
    """
    try:
        frame_bytes = base64.b64decode(data["frame"])
        frame_bgr   = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame_bgr is None:
            emit("error", {"message": "Invalid frame data"})
            return

        with _cache_lock:
            shirt = garment_cache.get(request.sid)
            acc   = accessory_cache.get(request.sid)

        if shirt is None and acc is None:
            emit("error", {"message": "No garment or accessory selected. Please select one."})
            return

        user_height_cm = float(data.get("user_height_cm", 175))
        result, detected_size, feedback = _run_fast_pipeline(
            frame_bgr, shirt, acc, user_height_cm
        )

        # Encode result frame
        _, buf   = cv2.imencode(".jpg", result, [cv2.IMWRITE_JPEG_QUALITY, 80])
        frame_b64 = base64.b64encode(buf).decode("utf-8")

        if feedback:
            emit("no_fit", {"message": feedback})
            # Still send the frame so the display doesn't freeze on "no person" frames
            emit("frame_processed", {"frame": frame_b64, "detected_size": detected_size})
            return

        emit("frame_processed", {"frame": frame_b64, "detected_size": detected_size})

    except Exception as e:
        emit("error", {"message": str(e)})

# ═══════════════════════════════════════════════════════════════
#  Socket.IO — frame_hq  (NEW — high quality mode)
# ═══════════════════════════════════════════════════════════════
@socketio.on("frame_hq")
def process_frame_hq(data):
    """
    High-quality try-on event.
    Latency: 2-8 s (HR-VITON) or ~500 ms (enhanced fast fallback).
    Emits: frame_processed_hq  { frame: base64, detected_size: str }
    Payload: same schema as process_frame
    """
    try:
        frame_bytes = base64.b64decode(data["frame"])
        frame_bgr   = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame_bgr is None:
            emit("error", {"message": "Invalid frame data"})
            return

        with _cache_lock:
            shirt = garment_cache.get(request.sid)

        if shirt is None:
            emit("error", {"message": "No garment selected for HQ mode"})
            return

        user_height_cm = float(data.get("user_height_cm", 175))
        result, detected_size = _run_hq_pipeline(frame_bgr, shirt, user_height_cm)

        _, buf    = cv2.imencode(".jpg", result, [cv2.IMWRITE_JPEG_QUALITY, 92])
        result_b64 = base64.b64encode(buf).decode("utf-8")
        emit("frame_processed_hq", {"frame": result_b64, "detected_size": detected_size})

    except Exception as e:
        emit("error", {"message": str(e)})

# ═══════════════════════════════════════════════════════════════
#  Entrypoint
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"🚀 WearYourStyle ML Server → http://0.0.0.0:{port}", flush=True)
    socketio.run(app, debug=False, host="0.0.0.0", port=port)