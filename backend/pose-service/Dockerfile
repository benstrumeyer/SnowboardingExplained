# ============================================
# POSE SERVICE - Multi-stage build for fast rebuilds
# ============================================
# Base image has: Miniconda, 4D-Humans conda env, PHALP, Flask
# This Dockerfile just adds: pose service code, SMPL model

FROM base-python-pose:latest as runtime

WORKDIR /app

# ============================================
# Copy SMPL model (3D body model)
# ============================================
COPY data/ /app/data/

# Verify SMPL model exists
RUN ls -la /app/data/ && \
    test -f /app/data/basicmodel_m_lbs_10_207_0_v1.1.0.pkl && \
    echo "[BUILD] ✓ SMPL model verified" || \
    echo "[BUILD] ⚠ SMPL model not found"

# ============================================
# Copy pose service code
# ============================================
COPY . /app/pose-service/

# Clean up unnecessary files
RUN rm -rf /app/pose-service/venv /app/pose-service/__pycache__ /app/pose-service/.git

# ============================================
# Verify everything works
# ============================================
RUN python -c "import flask; print('✓ Flask available')" && \
    python -c "import phalp; print('✓ PHALP available')" && \
    python -c "from hmr2.models import HMR2; print('✓ HMR2 available')"

# ============================================
# Runtime configuration
# ============================================
WORKDIR /app/pose-service

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["python", "flask_wrapper_minimal_safe.py"]
