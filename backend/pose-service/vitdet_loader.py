#!/usr/bin/env python3
"""
Isolated ViTDet loader that runs in a subprocess to prevent crashes from killing the main process.

This script loads ViTDet and saves the model to a cache file that can be loaded later.
"""

import sys
import os
import json
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

def load_vitdet_safe():
    """Load ViTDet with detailed error reporting"""
    try:
        logger.info("=" * 70)
        logger.info("VITDET LOADER - Isolated Process")
        logger.info("=" * 70)
        
        # Step 1: Import detectron2
        logger.info("Step 1: Importing detectron2...")
        from detectron2.config import LazyConfig
        logger.info("✓ detectron2 imported")
        
        # Step 2: Import HMR2
        logger.info("Step 2: Importing HMR2...")
        from pathlib import Path
        import hmr2
        from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
        logger.info("✓ HMR2 imported")
        
        # Step 3: Load config
        logger.info("Step 3: Loading config...")
        cfg_path = Path(hmr2.__file__).parent / 'configs' / 'cascade_mask_rcnn_vitdet_h_75ep.py'
        logger.info(f"Config path: {cfg_path}")
        
        if not cfg_path.exists():
            raise FileNotFoundError(f"Config not found: {cfg_path}")
        
        detectron2_cfg = LazyConfig.load(str(cfg_path))
        logger.info("✓ Config loaded")
        
        # Step 4: Configure
        logger.info("Step 4: Configuring...")
        detectron2_cfg.train.init_checkpoint = "https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl"
        for i in range(3):
            detectron2_cfg.model.roi_heads.box_predictors[i].test_score_thresh = 0.25
        logger.info("✓ Configuration complete")
        
        # Step 5: Create predictor (the dangerous part)
        logger.info("Step 5: Creating predictor (downloading ~2.7GB)...")
        start = time.time()
        
        predictor = DefaultPredictor_Lazy(detectron2_cfg)
        
        elapsed = time.time() - start
        logger.info(f"✓ Predictor created in {elapsed:.1f}s")
        
        logger.info("=" * 70)
        logger.info("SUCCESS: ViTDet loaded successfully")
        logger.info("=" * 70)
        
        return {"status": "success", "elapsed": elapsed}
        
    except Exception as e:
        logger.error(f"FAILED: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}

if __name__ == '__main__':
    result = load_vitdet_safe()
    print(json.dumps(result))
    sys.exit(0 if result["status"] == "success" else 1)
