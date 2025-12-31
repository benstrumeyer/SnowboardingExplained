
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

ENV PYTHONNOUSERSITE=1

# ============================================
# Install system dependencies + Python 3.9 + upgrade pip
# ============================================
RUN apt-get update && apt-get install -y --no-install-recommends \
        software-properties-common \
        wget \
        curl \
        git \
        build-essential \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y --no-install-recommends \
        python3.9 \
        python3.9-dev \
        python3.9-venv \
        python3-pip \
    && ln -sf /usr/bin/python3.9 /usr/bin/python \
    && ln -sf /usr/bin/python3.9 /usr/bin/python3 \
    && python3 -m pip install --upgrade pip setuptools wheel \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.9 as default
RUN ln -sf /usr/bin/python3.9 /usr/bin/python && \
    ln -sf /usr/bin/python3.9 /usr/bin/python3

# Upgrade pip
RUN python3 -m pip install --upgrade pip setuptools wheel

# Lock NumPy for Torch 2.0.x compatibility
RUN pip install "numpy<2.0"

# ============================================
# Install PyTorch 2.0.1 with CUDA 11.8
# ============================================
RUN pip install torch==2.0.1+cu118 torchvision==0.15.2+cu118 torchaudio==2.0.2+cu118 \
    --extra-index-url https://download.pytorch.org/whl/cu118

# ============================================
# Install PyTorch3D 0.7.4 (binary wheel)
# ============================================
RUN pip install pytorch3d==0.7.4 \
    -f https://dl.fbaipublicfiles.com/pytorch3d/packaging/wheels/py39_cu118_pyt201/download.html

# Lock Pillow for Detectron2 compatibility
RUN pip install "Pillow==9.5.0"

# Install Detectron2
# ============================================
RUN git clone https://github.com/facebookresearch/detectron2.git /app/detectron2 && \
    cd /app/detectron2 && \
    git checkout v0.6 && \
    pip install --no-build-isolation -e .

# ============================================
# Install PHALP runtime dependencies
# ============================================
RUN pip install \
    opencv-python-headless==4.8.1.78 \
    gdown==5.2.0 \
    beautifulsoup4==4.12.2 \
    scikit-image==0.19.3 \
    einops==0.8.1 \
    pandas==2.3.3 \
    timm==1.0.22 \
    pyrender==0.1.45 \
    scikit-learn==0.23.2 \
    joblib

# Re-pin Pillow for Detectron2 compatibility
RUN pip install Pillow==9.5.0

# ============================================
# Install PHALP
# ============================================
RUN pip install phalp==0.1.3 --no-deps

# Verify Torch version
RUN python - << 'EOF'
import torch
assert torch.__version__.startswith("2.0.1"), torch.__version__
print("✓ Torch version locked:", torch.__version__)
EOF

# ============================================
# Install 4D-Humans
# ============================================
RUN git clone https://github.com/shubham-goel/4D-Humans.git /app/4D-Humans && \
    cd /app/4D-Humans && \
     pip install --no-build-isolation --no-deps -e .

RUN python - << 'EOF'
import torch
assert torch.__version__.startswith("2.0.1"), torch.__version__
print("✓ Torch still locked:", torch.__version__)
EOF

# ============================================
# Remove system blinker (Flask 3.x)
# ============================================
RUN apt-get update && apt-get remove -y python3-blinker && rm -rf /var/lib/apt/lists/*

# ============================================
# Install Flask
# ============================================
RUN pip install flask==3.0.0 flask-cors==4.0.0

# ============================================
# Remove system sklearn (safety)
# ============================================
RUN apt-get update && apt-get remove -y python3-sklearn && rm -rf /var/lib/apt/lists/*

# ============================================
# FINAL NumPy pin (PHALP / OpenCV ABI-safe)
# ============================================
RUN pip install --force-reinstall "numpy<1.24"

# ============================================
# Verify installations
# ============================================
RUN python -c "import torch; print(f'✓ PyTorch {torch.__version__}')" && \
    python -c "import pytorch3d; print('✓ PyTorch3D installed')" && \
    python -c "import detectron2; print('✓ Detectron2 installed')" && \
    python -c "import phalp; print('✓ PHALP installed')" && \
    python -c "import flask; print(f'✓ Flask installed')"

# ============================================
# Runtime
# ============================================
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1
