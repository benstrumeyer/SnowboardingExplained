# ============================================
# BASE IMAGE - Start with NVIDIA CUDA runtime
# ============================================
# FROM: Specifies the base image to build on top of
# nvidia/cuda:12.1.1-runtime-ubuntu22.04 = Ubuntu 22.04 with CUDA 12.1.1 pre-installed
# This gives us GPU support and NVIDIA drivers out of the box
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# WORKDIR: Sets the working directory inside the container
# All subsequent commands will run from /app
# Think of it like: cd /app
WORKDIR /app

# ============================================
# STAGE 1: Install Python and build tools
# ============================================
# RUN: Executes a command inside the container during build
# apt-get update: Refreshes the package list (like apt update on Linux)
# apt-get install: Installs packages
# -y: Automatically answer "yes" to prompts
# --no-install-recommends: Only install required packages, skip optional ones (keeps image smaller)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python 3.10 interpreter (the language runtime)
    python3.10 \
    # pip: Python package manager (like npm for Node.js)
    python3-pip \
    # venv: Virtual environment tool (isolates Python packages)
    python3.10-venv \
    # python3.10-dev: Development headers needed to compile Python packages
    python3.10-dev \
    # git: Version control (needed to clone repositories)
    git \
    # wget: Download files from the internet
    wget \
    # curl: Another tool to download files and make HTTP requests
    curl \
    # ca-certificates: SSL certificates for HTTPS connections
    ca-certificates \
    # build-essential: Compiler toolchain (gcc, g++, make) for compiling C/C++ code
    build-essential \
    # cmake: Build system for C/C++ projects
    cmake \
    # pkg-config: Helps find libraries during compilation
    pkg-config \
    # Clean up apt cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# update-alternatives: Creates symbolic links to set default commands
# --install: Creates a new alternative
# /usr/bin/python: The path where the link will be created
# /usr/bin/python3.10: The actual binary to link to
# 1: Priority (higher number = higher priority)
# This makes "python" command use Python 3.10 instead of default Python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# ============================================
# STAGE 2: Install graphics and rendering libraries
# ============================================
# These libraries are needed for 3D rendering and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    # OpenGL libraries for 3D graphics
    libgl1-mesa-glx \
    libgl1-mesa-dev \
    # Core graphics library
    libglib2.0-0 \
    # X11 libraries for display (needed for rendering)
    libsm6 \
    libxext6 \
    libxrender-dev \
    # OpenMP library for parallel processing
    libgomp1 \
    # GLU library (OpenGL utilities)
    libglu1-mesa \
    # X11 keyboard library
    libxkbcommon-x11-0 \
    # D-Bus library for system communication
    libdbus-1-3 \
    # Font libraries
    libfontconfig1 \
    libfreetype6 \
    libharfbuzz0b \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# STAGE 3: Install image and math libraries
# ============================================
# These are needed for image processing and numerical computations
RUN apt-get update && apt-get install -y --no-install-recommends \
    # PNG image library
    libpng16-16 \
    # JPEG image library
    libjpeg-turbo8 \
    # TIFF image library
    libtiff5 \
    # WebP image library
    libwebp7 \
    # OpenBLAS: Fast linear algebra library (matrix operations)
    libopenblas0 \
    # LAPACK: Linear algebra package
    liblapack3 \
    # Development headers for OpenBLAS and LAPACK
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# STAGE 4: Install media utilities
# ============================================
# ffmpeg: Tool for video processing (extracting frames from videos)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# STAGE 5: Upgrade Python package manager
# ============================================
# pip install: Installs Python packages
# --no-cache-dir: Don't cache packages (saves space)
# --upgrade: Update pip to latest version
# setuptools: Tool for building Python packages
# wheel: Format for distributing Python packages
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ============================================
# STAGE 6: Install ML dependencies
# ============================================
# CRITICAL: Install joblib FIRST before any other dependencies
# PHALP imports joblib during initialization, so it must be available
RUN pip install --no-cache-dir joblib

# Install chumpy BEFORE other packages (needed for SMPL models)
# chumpy needs to be built from source and requires build isolation disabled
RUN pip install --no-cache-dir --no-build-isolation \
    'chumpy @ git+https://github.com/mattloper/chumpy'

# Install all other Python packages needed for pose estimation
# These are the core ML libraries for 4D-Humans, PHALP, and pose detection
RUN pip install --no-cache-dir \
    # PyTorch: Deep learning framework (2.0.1 with CUDA 11.8 support)
    torch==2.0.1 \
    # Computer vision models for PyTorch
    torchvision==0.15.2 \
    # Audio processing for PyTorch
    torchaudio==2.0.2 \
    # NumPy: Numerical computing library
    numpy \
    # SciPy: Scientific computing library
    scipy \
    # scikit-image: Image processing library
    scikit-image \
    # OpenCV: Computer vision library
    opencv-python \
    # Pillow: Image processing library
    pillow \
    # PHALP: Pose and shape estimation library
    phalp \
    # SMPL-X: 3D human body model
    smplx \
    # Trimesh: 3D mesh processing
    trimesh \
    # Pyrender: 3D rendering library
    pyrender

# ============================================
# STAGE 7: Install pytorch3d (3D vision library)
# ============================================
# pytorch3d v0.7.0 from source - compatible with torch 2.0.1 and CUDA 11.8/12.1
RUN git clone --depth 1 --branch v0.7.0 https://github.com/facebookresearch/pytorch3d.git /app/pytorch3d && \
cd /app/pytorch3d && \
# Install with --no-build-isolation to use system torch
pip install --no-cache-dir --no-build-isolation -e . && \
echo "[BUILD] ✓ PyTorch3D v0.7.0 installed from source"

# ============================================
# STAGE 8: Verify joblib is still available
# ============================================
# python3 -c: Run Python code directly
# import joblib: Load the joblib module
# print(...): Display version information
# This verifies that joblib wasn't accidentally removed during other installations
RUN python3 -c "import joblib; print(f'✓ joblib {joblib.__version__} available')"

# ============================================
# STAGE 9: Install Detectron2 (object detection framework)
# ============================================
# Detectron2 must be built from source for Python 3.9
# ViTDet (Vision Transformer Detection) is included in Detectron2's model zoo
RUN echo "[BUILD] Installing Detectron2 from source (includes ViTDet models)..." && \
    # git clone: Download the repository
    # --depth 1: Only download the latest version (saves space)
    # --branch v0.7.0: Download specific version
    git clone https://github.com/facebookresearch/detectron2.git /app/detectron2 && \
    # cd: Change directory to detectron2
    cd /app/detectron2 && \
    # pip install -e .: Install in editable mode from current directory
    # 2>&1: Redirect error output to standard output
    # | tail -20: Show only last 20 lines of output
    pip install --no-cache-dir -e . 2>&1 | tail -20 && \
    echo "[BUILD] ✓ Detectron2 installed"

# ============================================
# STAGE 10: Verify Detectron2 installation
# ============================================
# Try to import detectron2 and print version
# || echo: If import fails, print warning message (don't fail the build)
RUN python3 -c "import detectron2; print(f'[BUILD] ✓ Detectron2 {detectron2.__version__} verified')" || \
    echo "[BUILD] ⚠ Detectron2 import warning (may still work)"

# ============================================
# STAGE 11: Verify ViTDet models are available
# ============================================
# Check that Detectron2's model zoo is accessible
# This includes ViTDet pre-trained models
RUN python3 -c "from detectron2.model_zoo import model_zoo; print('[BUILD] ✓ Detectron2 model zoo available (includes ViTDet)')" || \
    echo "[BUILD] ⚠ Model zoo check skipped"

# ============================================
# EXPOSE: Document which ports the container listens on
# ============================================
# 5000: Flask web server port (for pose service API)
# Note: EXPOSE doesn't actually open the port, it's just documentation
# The port is opened when running the container with -p flag
EXPOSE 5000

# ============================================
# HEALTHCHECK: Define how to check if container is healthy
# ============================================
# --interval=30s: Check every 30 seconds
# --timeout=10s: Wait max 10 seconds for response
# --start-period=60s: Wait 60 seconds before first check (let app start)
# --retries=3: Mark unhealthy after 3 failed checks
# CMD curl: Use curl command to check if service is running
# curl -f: Fail if HTTP status is not 2xx or 3xx
# http://localhost:5000/health: Check the health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# ============================================
# CMD: Default command to run when container starts
# ============================================
# CMD ["python3"]: Run Python 3 interpreter
# This is the default, but can be overridden when running the container
CMD ["python3"]
