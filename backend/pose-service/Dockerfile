FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /app

# Install system dependencies in stages to avoid conflicts
# Stage 1: Core build tools and Python 3.10
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3.10-venv \
    python3.10-dev \
    git \
    wget \
    curl \
    ca-certificates \
    build-essential \
    cmake \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# Stage 2: Graphics and rendering libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libgl1-mesa-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglu1-mesa \
    libxkbcommon-x11-0 \
    libdbus-1-3 \
    libfontconfig1 \
    libfreetype6 \
    libharfbuzz0b \
    && rm -rf /var/lib/apt/lists/*

# Stage 3: Image and math libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng16-16 \
    libjpeg-turbo8 \
    libtiff5 \
    libwebp7 \
    libopenblas0 \
    liblapack3 \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# Stage 4: Media and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/pose-service/requirements.txt .

# CRITICAL: Install joblib FIRST before any other dependencies
# PHALP imports joblib during its own initialization
RUN pip install --no-cache-dir joblib

# Now install all other requirements (which includes phalp)
RUN pip install --no-cache-dir -r requirements.txt

# Verify joblib is available after all installations
RUN python3 -c "import joblib; print(f'✓ joblib {joblib.__version__} available')"

# Install pytorch3d 0.7.0 with proper build support
RUN pip install --no-cache-dir pytorch3d==0.7.0 || \
    (pip install --no-cache-dir 'git+https://github.com/facebookresearch/pytorch3d.git@v0.7.0' || \
    (git clone --depth 1 --branch v0.7.0 https://github.com/facebookresearch/pytorch3d.git /app/pytorch3d && \
    cd /app/pytorch3d && \
    pip install --no-cache-dir -e .))

# Stage 5: Copy and install 4D-Humans (already downloaded on Windows)
COPY backend/pose-service/4D-Humans /app/4D-Humans
RUN cd /app/4D-Humans && \
    pip install --no-cache-dir -e .

# Stage 6: Clone and install Detectron2 from source
# CRITICAL: This must happen AFTER build-essential is installed
# For Python 3.10, we need to build from source
# ViTDet is included in Detectron2's model zoo - no separate package needed
RUN echo "[BUILD] Installing Detectron2 from source (includes ViTDet models)..." && \
    git clone https://github.com/facebookresearch/detectron2.git /app/detectron2 && \
    cd /app/detectron2 && \
    pip install --no-cache-dir -e . 2>&1 | tail -20 && \
    echo "[BUILD] ✓ Detectron2 installed"

# CRITICAL: Verify Detectron2 installation
RUN python3 -c "import detectron2; print(f'[BUILD] ✓ Detectron2 {detectron2.__version__} verified')" || \
    echo "[BUILD] ⚠ Detectron2 import warning (may still work)"

# Verify ViTDet models are available in Detectron2
RUN python3 -c "from detectron2.model_zoo import model_zoo; print('[BUILD] ✓ Detectron2 model zoo available (includes ViTDet)')" || \
    echo "[BUILD] ⚠ Model zoo check skipped"

# Copy SMPL model INTO the image (CRITICAL - must be done during build)
# This ensures the model is available inside the container
COPY backend/pose-service/data/ /app/data/

# Verify SMPL model exists
RUN ls -la /app/data/ && \
    test -f /app/data/basicModel_neutral_lbs_10_207_0_v1.0.0.pkl && \
    echo "[BUILD] ✓ SMPL model verified" || \
    echo "[BUILD] ⚠ SMPL model not found - will attempt download on first request"

# Copy pose service code (excluding venv and large directories)
COPY backend/pose-service/ .

# Remove venv if it was copied (shouldn't be due to .dockerignore)
RUN rm -rf venv __pycache__ .git

# Expose Flask port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start Flask wrapper
CMD ["python3", "flask_wrapper_minimal_safe.py"]
