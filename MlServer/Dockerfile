FROM python:3.11-slim

# Install system dependencies for OpenCV and MediaPipe
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    libx11-6 \
    libgomp1 \
    libgles2 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create user 1000 (Hugging Face Spaces requirement)
RUN useradd -m -u 1000 user && chown -R user:user /app
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Copy requirements and install
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download MediaPipe model
RUN wget -O pose_landmarker.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task

# Copy the rest of the code
COPY --chown=user . .

# Run the server
CMD ["python", "main.py"]
