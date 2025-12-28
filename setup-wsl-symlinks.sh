#!/bin/bash
# Setup WSL symlinks for 4D-Humans and pose service
# This script creates symlinks for all necessary directories if they don't already exist

set -e

echo "=========================================="
echo "WSL Symlink Setup for 4D-Humans"
echo "=========================================="

# Define source and target directories
WINDOWS_REPO="/mnt/c/Users/benja/repos/SnowboardingExplained"
WSL_HOME="$HOME"
POSE_SERVICE_DIR="$WSL_HOME/pose-service"

echo ""
echo "Source (Windows): $WINDOWS_REPO"
echo "Target (WSL): $POSE_SERVICE_DIR"
echo ""

# Create pose-service directory if it doesn't exist
if [ ! -d "$POSE_SERVICE_DIR" ]; then
    echo "[SETUP] Creating $POSE_SERVICE_DIR..."
    mkdir -p "$POSE_SERVICE_DIR"
else
    echo "[SETUP] ✓ $POSE_SERVICE_DIR already exists"
fi

# Function to create symlink
create_symlink() {
    local source="$1"
    local target="$2"
    local name="$3"
    
    if [ ! -e "$target" ]; then
        if [ -d "$source" ]; then
            echo "[SYMLINK] Creating symlink: $target -> $source"
            ln -s "$source" "$target"
            echo "[SYMLINK] ✓ $name symlink created"
        else
            echo "[SYMLINK] ✗ Source not found: $source"
        fi
    else
        if [ -L "$target" ]; then
            echo "[SYMLINK] ✓ $name symlink already exists"
        else
            echo "[SYMLINK] ⚠ $target exists but is not a symlink"
        fi
    fi
}

echo ""
echo "=========================================="
echo "Creating Symlinks"
echo "=========================================="
echo ""

# 1. 4D-Humans directory
echo "[1/5] Setting up 4D-Humans..."
create_symlink \
    "$WINDOWS_REPO/backend/pose-service/4D-Humans" \
    "$POSE_SERVICE_DIR/4D-Humans" \
    "4D-Humans"

# 2. PHALP directory
echo ""
echo "[2/5] Setting up PHALP..."
create_symlink \
    "$WINDOWS_REPO/backend/pose-service/PHALP" \
    "$POSE_SERVICE_DIR/PHALP" \
    "PHALP"

# 3. Flask wrapper
echo ""
echo "[3/5] Setting up Flask wrapper..."
if [ ! -f "$POSE_SERVICE_DIR/flask_wrapper_minimal_safe.py" ]; then
    if [ -f "$WINDOWS_REPO/backend/pose-service/flask_wrapper_minimal_safe.py" ]; then
        echo "[SYMLINK] Creating symlink: $POSE_SERVICE_DIR/flask_wrapper_minimal_safe.py"
        ln -s "$WINDOWS_REPO/backend/pose-service/flask_wrapper_minimal_safe.py" \
            "$POSE_SERVICE_DIR/flask_wrapper_minimal_safe.py"
        echo "[SYMLINK] ✓ Flask wrapper symlink created"
    else
        echo "[SYMLINK] ✗ Flask wrapper not found"
    fi
else
    if [ -L "$POSE_SERVICE_DIR/flask_wrapper_minimal_safe.py" ]; then
        echo "[SYMLINK] ✓ Flask wrapper symlink already exists"
    else
        echo "[SYMLINK] ⚠ Flask wrapper exists but is not a symlink"
    fi
fi

# 4. HMR2 loader
echo ""
echo "[4/5] Setting up HMR2 loader..."
if [ ! -f "$POSE_SERVICE_DIR/hmr2_loader.py" ]; then
    if [ -f "$WINDOWS_REPO/backend/pose-service/hmr2_loader.py" ]; then
        echo "[SYMLINK] Creating symlink: $POSE_SERVICE_DIR/hmr2_loader.py"
        ln -s "$WINDOWS_REPO/backend/pose-service/hmr2_loader.py" \
            "$POSE_SERVICE_DIR/hmr2_loader.py"
        echo "[SYMLINK] ✓ HMR2 loader symlink created"
    else
        echo "[SYMLINK] ⚠ HMR2 loader not found (optional)"
    fi
else
    if [ -L "$POSE_SERVICE_DIR/hmr2_loader.py" ]; then
        echo "[SYMLINK] ✓ HMR2 loader symlink already exists"
    else
        echo "[SYMLINK] ⚠ HMR2 loader exists but is not a symlink"
    fi
fi

# 5. Create necessary directories
echo ""
echo "[5/5] Creating necessary directories..."

# Create output directories
mkdir -p "$POSE_SERVICE_DIR/outputs"
echo "[SETUP] ✓ Created $POSE_SERVICE_DIR/outputs"

mkdir -p /tmp/pose-videos
echo "[SETUP] ✓ Created /tmp/pose-videos"

mkdir -p /tmp/pose-service-logs
echo "[SETUP] ✓ Created /tmp/pose-service-logs"

mkdir -p /tmp/phalp_output
echo "[SETUP] ✓ Created /tmp/phalp_output"

echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""

# Verify symlinks
echo "Checking symlinks..."
echo ""

if [ -L "$POSE_SERVICE_DIR/4D-Humans" ]; then
    echo "✓ 4D-Humans: $(readlink $POSE_SERVICE_DIR/4D-Humans)"
else
    echo "✗ 4D-Humans symlink not found"
fi

if [ -L "$POSE_SERVICE_DIR/PHALP" ]; then
    echo "✓ PHALP: $(readlink $POSE_SERVICE_DIR/PHALP)"
else
    echo "✗ PHALP symlink not found"
fi

if [ -L "$POSE_SERVICE_DIR/flask_wrapper_minimal_safe.py" ]; then
    echo "✓ Flask wrapper: $(readlink $POSE_SERVICE_DIR/flask_wrapper_minimal_safe.py)"
else
    echo "✗ Flask wrapper symlink not found"
fi

if [ -L "$POSE_SERVICE_DIR/hmr2_loader.py" ]; then
    echo "✓ HMR2 loader: $(readlink $POSE_SERVICE_DIR/hmr2_loader.py)"
else
    echo "⚠ HMR2 loader symlink not found (optional)"
fi

echo ""
echo "Directory structure:"
ls -la "$POSE_SERVICE_DIR" | grep -E "^l|^d" | awk '{print "  " $0}'

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify all symlinks are created correctly"
echo "2. Test track.py startup: cd $POSE_SERVICE_DIR/4D-Humans && python test_startup.py"
echo "3. Start Flask wrapper: cd $POSE_SERVICE_DIR && python flask_wrapper_minimal_safe.py"
echo ""
