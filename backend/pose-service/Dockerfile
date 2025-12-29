# ============================================
# MULTI-STAGE BUILD: Dependencies Stage
# ============================================
# This Dockerfile uses multi-stage builds to optimize caching
# Stage 1 (deps): Install dependencies - cached and reused
# Stage 2 (build): Add application code - rebuilt when code changes
# Stage 3 (runtime): Final image with only what's needed

# FROM base-python-pose:latest as deps
# FROM: Use the base image we created earlier (has all ML dependencies)
# as deps: Name this stage "deps" so we can reference it later
FROM base-python-pose:latest as deps

# WORKDIR: Set working directory to /app
WORKDIR /app

# ============================================
# Install Python dependencies
# ============================================
# COPY: Copy files from host machine into container
# backend/pose-service/requirements.txt: Source file on host
# .: Destination in container (current directory = /app)
# This copies the list of Python packages to install
COPY backend/pose-service/requirements.txt .

# RUN pip install: Install all packages listed in requirements.txt
# --no-cache-dir: Don't cache packages (saves space)
# -r requirements.txt: Read package list from file
RUN pip install --no-cache-dir -r requirements.txt

# ============================================
# Copy SMPL model (3D body model)
# ============================================
# COPY: Copy files from host into container
# backend/pose-service/data/: Source directory with model files
# /app/data/: Destination in container
# This copies the SMPL model file needed for pose estimation
COPY backend/pose-service/data/ /app/data/

# ============================================
# Verify SMPL model exists
# ============================================
# ls -la: List files in directory (for debugging)
# test -f: Check if file exists
# &&: Run next command only if previous succeeded
# echo: Print success message
# ||: Run next command if previous failed
# This verifies the model file was copied correctly
RUN ls -la /app/data/ && \
    test -f /app/data/basicmodel_m_lbs_10_207_0_v1.1.0.pkl && \
    echo "[BUILD] ✓ SMPL model verified" || \
    echo "[BUILD] ⚠ SMPL model not found"

# ============================================
# BUILD STAGE: Add application code
# ============================================
# FROM deps as build
# FROM: Use the previous stage (deps) as base
# as build: Name this stage "build"
FROM deps as build

# WORKDIR: Set working directory
WORKDIR /app

# ============================================
# Copy pose service code
# ============================================
# COPY: Copy all files from pose-service directory
# backend/pose-service/: Source directory on host
# .: Destination in container (current directory = /app)
# This copies the Python code for the pose service
COPY backend/pose-service/ .

# ============================================
# Clean up unnecessary files
# ============================================
# RUN rm -rf: Remove directories
# venv: Virtual environment (not needed in container)
# __pycache__: Python cache files (not needed)
# .git: Git history (not needed)
# This keeps the image smaller
RUN rm -rf venv __pycache__ .git

# ============================================
# Verify all ML libraries are available
# ============================================
# python3 -c: Run Python code directly
# import phalp: Load the PHALP library
# print(...): Print success message
# These verify that all dependencies installed correctly
RUN python3 -c "import phalp; print('✓ PHALP available')" && \
    python3 -c "import detectron2; print('✓ Detectron2 available')" && \
    python3 -c "import pytorch3d; print('✓ pytorch3d available')"

# ============================================
# RUNTIME STAGE: Final image
# ============================================
# FROM base-python-pose:latest as runtime
# FROM: Use the base image again (fresh copy)
# as runtime: Name this stage "runtime"
# We use the base image again (not the build stage) to keep image small
# The build stage is only used to verify code, not included in final image
FROM base-python-pose:latest as runtime

# WORKDIR: Set working directory
WORKDIR /app

# ============================================
# Copy SMPL model
# ============================================
# COPY: Copy model files from host
# backend/pose-service/data/: Source directory
# /app/data/: Destination in container
COPY backend/pose-service/data/ /app/data/

# ============================================
# Copy application code from build stage
# ============================================
# COPY --from=build: Copy files from a previous stage (not from host)
# /app: Source directory in build stage
# /app: Destination in runtime stage
# This copies the verified code from the build stage
COPY --from=build /app /app

# ============================================
# EXPOSE: Document which port the app uses
# ============================================
# 5000: Flask web server port
EXPOSE 5000

# ============================================
# HEALTHCHECK: Define how to check if container is healthy
# ============================================
# --interval=30s: Check every 30 seconds
# --timeout=10s: Wait max 10 seconds for response
# --start-period=60s: Wait 60 seconds before first check (let app start)
# --retries=3: Mark unhealthy after 3 failed checks
# CMD curl: Use curl to check if service is running
# curl -f: Fail if HTTP status is not 2xx or 3xx
# http://localhost:5000/health: Check the health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# ============================================
# CMD: Default command when container starts
# ============================================
# CMD ["python3", "flask_wrapper_minimal_safe.py"]
# This runs the Flask web server when the container starts
# The Flask server listens on port 5000 for video upload requests
CMD ["python3", "flask_wrapper_minimal_safe.py"]
