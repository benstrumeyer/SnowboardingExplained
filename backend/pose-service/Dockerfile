FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /app

# Install system dependencies in stages to avoid conflicts
# Stage 1: Core build tools and Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3.10-venv \
    git \
    wget \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

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
RUN pip install --no-cache-dir -r requirements.txt

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
