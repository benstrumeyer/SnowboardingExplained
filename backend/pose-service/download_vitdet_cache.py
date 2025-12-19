#!/usr/bin/env python3
"""
Pre-download and cache both HMR2 and ViTDet models (WSL only).

Run this once in WSL to pre-load both models into memory.
Subsequent service starts will load instantly from cache.

Usage (in WSL with venv activated):
    python3 download_vitdet_cache.py

This will:
1. Download HMR2 checkpoint (~500MB) if needed
2. Download ViTDet model (~2.7GB) if needed
3. Pre-load both models into memory for instant startup
"""

import os
import sys
import logging
import time

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

def download_and_cache_models():
    """Download and pre-load both HMR2 and ViTDet models"""
    try:
        logger.info("=" * 60)
        logger.info("Model Cache Setup - HMR2 + ViTDet")
        logger.info("=" * 60)
        
        # Add 4D-Humans to path
        hmr2_path = os.path.join(os.path.dirname(__file__), '4D-Humans')
        if hmr2_path not in sys.path:
            sys.path.insert(0, hmr2_path)
        
        # ===== STEP 1: Load HMR2 =====
        logger.info("")
        logger.info("[1/2] Loading HMR2 model...")
        logger.info("-" * 60)
        
        start_hmr2 = time.time()
        try:
            from hmr2_loader import get_hmr2_modules
            
            hmr2_modules = get_hmr2_modules()
            if not hmr2_modules:
                logger.error("✗ Failed to load HMR2 modules")
                return False
            
            download_models = hmr2_modules.get('download_models')
            load_hmr2 = hmr2_modules.get('load_hmr2')
            CACHE_DIR_4DHUMANS = hmr2_modules.get('CACHE_DIR_4DHUMANS')
            
            if not all([download_models, load_hmr2, CACHE_DIR_4DHUMANS]):
                logger.error("✗ Failed to get HMR2 functions")
                return False
            
            logger.info(f"Cache directory: {CACHE_DIR_4DHUMANS}")
            
            # Download HMR2 data if needed
            logger.info("Downloading HMR2 data (~500MB)...")
            download_models(CACHE_DIR_4DHUMANS)
            
            # Load HMR2 model
            logger.info("Loading HMR2 checkpoint...")
            hmr2_model, hmr2_cfg = load_hmr2()
            
            hmr2_time = time.time() - start_hmr2
            logger.info(f"✓ HMR2 loaded in {hmr2_time:.1f}s")
            
        except Exception as e:
            logger.error(f"✗ HMR2 loading failed: {e}", exc_info=True)
            return False
        
        # ===== STEP 2: Load ViTDet =====
        logger.info("")
        logger.info("[2/2] Loading ViTDet model...")
        logger.info("-" * 60)
        
        start_vitdet = time.time()
        try:
            from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
            from detectron2.config import LazyConfig
            from pathlib import Path
            import hmr2
            
            # Load ViTDet config
            cfg_path = Path(hmr2.__file__).parent / 'configs' / 'cascade_mask_rcnn_vitdet_h_75ep.py'
            logger.info(f"Config path: {cfg_path}")
            
            if not cfg_path.exists():
                logger.error(f"✗ Config file not found: {cfg_path}")
                return False
            
            detectron2_cfg = LazyConfig.load(str(cfg_path))
            
            # Set checkpoint URL
            detectron2_cfg.train.init_checkpoint = "https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl"
            
            # Set score threshold
            for i in range(len(detectron2_cfg.model.roi_heads.box_predictors)):
                detectron2_cfg.model.roi_heads.box_predictors[i].test_score_thresh = 0.25
            
            logger.info("Creating ViTDet predictor (downloading ~2.7GB)...")
            predictor = DefaultPredictor_Lazy(detectron2_cfg)
            
            vitdet_time = time.time() - start_vitdet
            logger.info(f"✓ ViTDet loaded in {vitdet_time:.1f}s")
            
        except Exception as e:
            logger.error(f"✗ ViTDet loading failed: {e}", exc_info=True)
            return False
        
        # ===== SUCCESS =====
        total_time = time.time() - start_hmr2
        logger.info("")
        logger.info("=" * 60)
        logger.info("✓ All models cached successfully!")
        logger.info("=" * 60)
        logger.info(f"HMR2:   {hmr2_time:.1f}s")
        logger.info(f"ViTDet: {vitdet_time:.1f}s")
        logger.info(f"Total:  {total_time:.1f}s")
        logger.info("")
        logger.info("Next service startup will be instant!")
        logger.info("=" * 60)
        return True
            
    except Exception as e:
        logger.error(f"✗ Error during cache setup: {e}", exc_info=True)
        return False

if __name__ == '__main__':
    success = download_and_cache_models()
    sys.exit(0 if success else 1)
