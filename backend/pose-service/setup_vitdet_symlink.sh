#!/bin/bash
# Verify ViTDet model cache in WSL
# The model is cached by detectron2 at ~/.torch/iopath_cache/

set -e

echo "=========================================="
echo "ViTDet Cache Verification"
echo "=========================================="
echo ""

# Detectron2 cache location
DETECTRON2_CACHE="$HOME/.torch/iopath_cache/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692"
MODEL_FILE="$DETECTRON2_CACHE/model_final_f05665.pkl"

echo "Checking detectron2 cache..."
echo "Cache path: $DETECTRON2_CACHE"
echo ""

# Check if model file exists
if [ ! -f "$MODEL_FILE" ]; then
    echo "⚠️  Model file not found: $MODEL_FILE"
    echo ""
    echo "Please download the ViTDet model first:"
    echo "  python3 download_vitdet_cache.py"
    echo ""
    exit 1
fi

# Get model size
MODEL_SIZE=$(du -h "$MODEL_FILE" | cut -f1)
echo "✓ ViTDet model found: $MODEL_SIZE"
echo ""

# Show full path
echo "Full path:"
ls -lh "$MODEL_FILE"
echo ""

echo "=========================================="
echo "Cache verification complete!"
echo "=========================================="
echo ""
echo "The ViTDet model is cached and ready to use."
echo "You can now run the pose service without re-downloading."
echo ""
