import os
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import base64
import requests

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10**7)

# Session-based garment cache
garment_cache = {}

# MediaPipe Initialization
model_dir = os.path.dirname(__file__)
pose_model_path = os.path.join(model_dir, "pose_landmarker.task")
classifier_model_path = os.path.join(model_dir, "classifier.tflite")

# Haar Cascades for facial features and positioning (Virtual Accessories)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Download classifier model if not exists (EfficientNet Lite0)
if not os.path.exists(classifier_model_path):
    print("Downloading image classifier model...")
    url = "https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite"
    r = requests.get(url)
    with open(classifier_model_path, "wb") as f:
        f.write(r.content)

# Pose Detector
pose_base_options = python.BaseOptions(model_asset_path=pose_model_path)
pose_options = vision.PoseLandmarkerOptions(
    base_options=pose_base_options,
    output_segmentation_masks=False)
detector = vision.PoseLandmarker.create_from_options(pose_options)

# Image Classifier
classifier_base_options = python.BaseOptions(model_asset_path=classifier_model_path)
classifier_options = vision.ImageClassifierOptions(
    base_options=classifier_base_options,
    max_results=5)
classifier = vision.ImageClassifier.create_from_options(classifier_options)

def get_color_name(hsv_color):
    h, s, v = hsv_color
    if v < 40: return "Black"
    if v > 200 and s < 40: return "White"
    if s < 40: return "Gray"
    
    if h < 10 or h > 170: return "Red"
    if 10 <= h < 25: return "Orange"
    if 25 <= h < 35: return "Yellow"
    if 35 <= h < 85: return "Green"
    if 85 <= h < 130: return "Blue"
    if 130 <= h < 170: return "Purple"
    return "Unknown"

@app.route('/classify', methods=['POST'])
def classify_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        np_img = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Invalid image'}), 400

        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        
        # Classify
        classification_result = classifier.classify(mp_image)
        
        top_category = "Clothing"
        confidence = 0.0
        
        if classification_result.classifications:
            categories = classification_result.classifications[0].categories
            # Filtering for clothing items (simplistic mapping for demo)
            clothing_items = ["jersey", "t-shirt", "shirt", "gown", "jean", "skirt", "suit"]
            for cat in categories:
                if any(item in cat.category_name.lower() for item in clothing_items):
                    top_category = cat.category_name.split(',')[0].capitalize()
                    confidence = cat.score
                    break
            
            if top_category == "Clothing" and categories:
                top_category = categories[0].category_name.split(',')[0].capitalize()
                confidence = categories[0].score

        # Color Detection (using center of image)
        h, w, _ = img.shape
        center_roi = img[h//3:2*h//3, w//3:2*w//3]
        avg_color_bgr = np.mean(center_roi, axis=(0, 1))
        hsv_img = cv2.cvtColor(np.uint8([[avg_color_bgr]]), cv2.COLOR_BGR2HSV)[0][0]
        color_name = get_color_name(hsv_img)

        return jsonify({
            'type': top_category,
            'color': color_name,
            'confidence': float(confidence)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def overlay_png(background, overlay, position):
    bg_h, bg_w, bg_channels = background.shape
    overlay_h, overlay_w, overlay_channels = overlay.shape

    x, y = position

    # Calculate visible region of overlay
    ov_x1 = max(0, -x)
    ov_y1 = max(0, -y)
    
    # Calculate visible region applied on background
    bg_x1 = max(0, x)
    bg_y1 = max(0, y)
    
    ov_x2 = overlay_w
    ov_y2 = overlay_h
    
    if x + overlay_w > bg_w:
        ov_x2 = bg_w - x
    if y + overlay_h > bg_h:
        ov_y2 = bg_h - y
        
    bg_x2 = bg_x1 + (ov_x2 - ov_x1)
    bg_y2 = bg_y1 + (ov_y2 - ov_y1)

    if ov_x2 <= ov_x1 or ov_y2 <= ov_y1:
        return background

    # Extract regions
    overlay_visible = overlay[ov_y1:ov_y2, ov_x1:ov_x2]
    background_roi = background[bg_y1:bg_y2, bg_x1:bg_x2]

    # Handle Alpha Channel correctly
    if overlay_visible.shape[2] == 4:
        alpha_s = overlay_visible[:, :, 3] / 255.0
        alpha_l = 1.0 - alpha_s

        for c in range(0, 3):
            background_roi[:, :, c] = (
                alpha_s * overlay_visible[:, :, c] +
                alpha_l * background_roi[:, :, c]
            )
    else:
        for c in range(0, 3):
            background_roi[:, :, c] = overlay_visible[:, :, c]

    background[bg_y1:bg_y2, bg_x1:bg_x2] = background_roi
    return background

def crop_to_content(image):
    if image.shape[2] == 4:
        alpha = image[:, :, 3]
        coords = cv2.findNonZero(alpha)
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            return image[y:y+h, x:x+w]
    return image

def remove_background(image):
    # Ensure image has alpha channel
    if image.shape[2] == 3:
        b, g, r = cv2.split(image)
        alpha = np.ones(b.shape, dtype=b.dtype) * 255
        image = cv2.merge((b, g, r, alpha))
        
    # Check if the image already has transparency (pre-cut)
    min_alpha = np.min(image[:, :, 3])
    if min_alpha < 255:
        return image
        
    h, w = image.shape[:2]
    # mask needs to be 2 pixels wider and higher
    mask = np.zeros((h+2, w+2), np.uint8)
    
    # get fill image ignoring existing alpha
    fill_img = image[:,:,:3].copy()
    
    diff = (12, 12, 12)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY # 4 connectivity + mask only
    
    cv2.floodFill(fill_img, mask, (0,0), 0, diff, diff, flags)
    cv2.floodFill(fill_img, mask, (w-1,0), 0, diff, diff, flags)
    cv2.floodFill(fill_img, mask, (0,h-1), 0, diff, diff, flags)
    cv2.floodFill(fill_img, mask, (w-1,h-1), 0, diff, diff, flags)
    
    bg_mask = mask[1:h+1, 1:w+1]
    
    # Erode the object slightly to prevent white halos
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    bg_mask = cv2.dilate(bg_mask, kernel, iterations=1)
    
    # Set existing alpha to 0 where background was found
    current_alpha = image[:, :, 3]
    image[:, :, 3] = np.where(bg_mask == 1, 0, current_alpha).astype(np.uint8)
    
    return image

@socketio.on('update_garment')
def update_garment(data):
    try:
        shirt_data = base64.b64decode(data['shirt'])
        shirt = cv2.imdecode(np.frombuffer(shirt_data, np.uint8), cv2.IMREAD_UNCHANGED)
        if shirt is not None:
            # Dynamically delete manufacturer solid backgrounds
            shirt = remove_background(shirt)
            
            garment_cache[request.sid] = shirt
            emit('garment_updated', {'status': 'success'})
        else:
            emit('error', {'message': 'Invalid shirt data'})
    except Exception as e:
        emit('error', {'message': f'Garment update failed: {str(e)}'})

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in garment_cache:
        del garment_cache[request.sid]

@socketio.on('process_frame')
def process_frame(data):
    try:
        detected_size = "Unknown"
        # Decode the frame from base64
        frame_data = base64.b64decode(data['frame'])
        frame = cv2.imdecode(np.frombuffer(frame_data, np.uint8), cv2.IMREAD_COLOR)

        if frame is None:
            emit('error', {'message': 'Invalid frame data'})
            return

        # Retrieve cached shirt for this session
        shirt = garment_cache.get(request.sid)

        if shirt is None:
            emit('error', {'message': 'No shirt selected. Please select one.'})
            return

        cropped_shirt = crop_to_content(shirt)

        # Convert frame to MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # --- Haar Cascade: Facial Features and Positioning ---
        # Used for real-time object detection (e.g., placing virtual accessories like glasses or hats)
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        for (fx, fy, fw, fh) in faces:
            # Draw a subtle bounding box around the face for positioning accessories
            cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (200, 200, 200), 1)
            cv2.putText(frame, "Face (Accessory Anchor)", (fx, fy - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
            
            # Detect eyes within the face region for precise feature mapping (e.g., glasses)
            roi_gray = gray_frame[fy:fy+fh, fx:fx+fw]
            roi_color = frame[fy:fy+fh, fx:fx+fw]
            eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
            
            for (ex, ey, ew, eh) in eyes:
                cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (150, 150, 150), 1)
        # -----------------------------------------------------
        
        # Detect pose landmarks
        detection_result = detector.detect(mp_image)

        if detection_result.pose_landmarks:
            landmarks = detection_result.pose_landmarks[0]
            
            # Extract 8 body landmark coordinates (x, y for left/right shoulders & hips)
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
            left_hip = landmarks[23]
            right_hip = landmarks[24]

            h, w, _ = frame.shape
            ls_x, ls_y = int(left_shoulder.x * w), int(left_shoulder.y * h)
            rs_x, rs_y = int(right_shoulder.x * w), int(right_shoulder.y * h)
            lh_x, lh_y = int(left_hip.x * w), int(left_hip.y * h)
            rh_x, rh_y = int(right_hip.x * w), int(right_hip.y * h)

            # Convert to NumPy vectors for precise geometry
            rs = np.array([rs_x, rs_y], dtype=np.float32)
            ls = np.array([ls_x, ls_y], dtype=np.float32)
            rh = np.array([rh_x, rh_y], dtype=np.float32)
            lh = np.array([lh_x, lh_y], dtype=np.float32)

            neck = (rs + ls) / 2.0
            mid_hip = (rh + lh) / 2.0

            shoulder_width = np.sqrt((ls_x - rs_x)**2 + (ls_y - rs_y)**2)
            torso_height = np.sqrt((neck[0] - mid_hip[0])**2 + (neck[1] - mid_hip[1])**2)

            if shoulder_width > 0 and torso_height > 0:
                normalized_shoulder = shoulder_width / w
                if normalized_shoulder < 0.18:
                    detected_size = "S (Small)"
                elif 0.18 <= normalized_shoulder < 0.25:
                    detected_size = "M (Medium)"
                elif 0.25 <= normalized_shoulder < 0.35:
                    detected_size = "L (Large)"
                else:
                    detected_size = "XL (Extra Large)"

                # Compute body tilt angle and perpendicular unit vector pointing upwards (decreasing y)
                dx = ls_x - rs_x
                dy = ls_y - rs_y
                ux = dy / shoulder_width
                uy = -dx / shoulder_width
                u = np.array([ux, uy], dtype=np.float32)

                # Anchor offset to place the top of the garment just above the shoulder line
                offset_val = torso_height * 0.08
                offset = u * offset_val

                # Scale parameters
                width_scale_factor = 1.45
                height_scale_factor = 1.15

                # Destination points: 1) top-middle (neck+offset), 2) top-left (right shoulder boundary), 3) bottom-middle (hip midpoint)
                p_dst1 = neck + offset
                p_dst2 = neck + (rs - neck) * width_scale_factor + offset
                p_dst3 = neck + (mid_hip - neck) * height_scale_factor + offset

                # Source points on the cropped shirt: 1) top-middle, 2) top-left, 3) bottom-middle
                sh, sw = cropped_shirt.shape[:2]
                src_pts = np.array([
                    [sw / 2.0, 0.0],
                    [0.0, 0.0],
                    [sw / 2.0, sh]
                ], dtype=np.float32)

                dst_pts = np.array([
                    p_dst1,
                    p_dst2,
                    p_dst3
                ], dtype=np.float32)

                # Calculate the affine transformation matrix
                M = cv2.getAffineTransform(src_pts, dst_pts)

                # Warp the garment image to fit the body tilt, size, and perspective
                warped_shirt = cv2.warpAffine(
                    cropped_shirt,
                    M,
                    (w, h),
                    flags=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_CONSTANT,
                    borderValue=(0, 0, 0, 0)
                )

                # Overlay using the existing overlay_png function at (0, 0)
                frame = overlay_png(frame, warped_shirt, (0, 0))
            else:
                emit('no_fit', {'message': 'Stand back for detection'})
        else:
            emit('no_fit', {'message': 'Person not found'})

        # Encode the processed frame back to base64 as JPEG for lower latency & higher real-time frame rates
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        processed_frame = base64.b64encode(buffer).decode('utf-8')

        # Send the processed frame back to the client
        emit('frame_processed', {'frame': processed_frame, 'detected_size': detected_size})
    except Exception as e:
        emit('error', {'message': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"AI ML Server starting on port {port}...")
    socketio.run(app, debug=False, host='0.0.0.0', port=port)