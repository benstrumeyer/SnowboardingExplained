# ============================================
# BASE IMAGE - Python on Debian
# ============================================
# FROM: Specifies the base image
# python:3.9-slim-bullseye = Python 3.9 on Debian Bullseye (slim version)
# "slim" means minimal - only essential packages, no build tools
# This is a good balance between size and functionality
FROM python:3.9-slim-bullseye

# WORKDIR: Sets the working directory inside the container
# All subsequent commands run from /app
WORKDIR /app

# ============================================
# Install system dependencies
# ============================================
# apt-get update: Refresh package list
# apt-get install: Install packages
# -y: Automatically answer "yes"
# --no-install-recommends: Only install required packages (keeps image smaller)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # build-essential: Compiler toolchain (gcc, g++, make)
    # Needed to compile Python packages with C extensions
    build-essential \
    # git: Version control (needed to clone repositories)
    git \
    # wget: Download files from internet
    wget \
    # curl: Another tool to download files and make HTTP requests
    curl \
    # ca-certificates: SSL certificates for HTTPS connections
    ca-certificates \
    # Graphics libraries for image processing
    libgl1-mesa-glx \
    libglib2.0-0 \
    # X11 libraries for display/rendering
    libsm6 \
    libxext6 \
    libxrender-dev \
    # Clean up apt cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Upgrade Python package manager
# ============================================
# pip install: Install Python packages
# --no-cache-dir: Don't cache packages (saves space)
# --upgrade: Update to latest version
# setuptools: Tool for building Python packages
# wheel: Format for distributing Python packages
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ============================================
# Verify Python and pip are available
# ============================================
# python --version: Print Python version
# pip --version: Print pip version
# These verify the installation worked
RUN python --version && pip --version

# ============================================
# EXPOSE: Document which port the app uses
# ============================================
# 5000: Default Flask web server port
# Note: This doesn't actually open the port, just documents it
EXPOSE 5000

# ============================================
# CMD: Default command when container starts
# ============================================
# CMD ["python"]: Run the Python interpreter
# This can be overridden when running the container
CMD ["python"]
