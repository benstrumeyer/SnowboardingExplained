# Implementation Plan: 4D-Humans with PHALP Integration

## Overview

This plan implements 4D-Humans with PHALP temporal tracking on WSL, achieving 100% frame coverage (140/140 frames) instead of the current 90/140 (36% loss). The implementation is a drop-in replacement for the existing Flask wrapper with no backend code changes required.

## Tasks

- [x] 1. Clone 4D-Humans Repository on WSL
  - SSH into WSL and navigate to `/home/ben/pose-service`
  - Clone 4D-Humans from GitHub: `git clone https://github.com/shubham-goel/4D-Humans.git`
  - Verify repository structure (hmr2/, phalp/, track.py, requirements.txt)
  - _Requirements: 1_

- [x] 2. Install 4D-Humans Dependencies
  - Create Python virtual environment: `python3 -m venv venv`
  - Activate virtual environment: `source venv/bin/activate`
  - Install PyTorch with CUDA: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`
  - Install 4D-Humans requirements: `pip install -r requirements.txt`
  - Install PHALP: `pip install git+https://github.com/brjathu/PHALP.git`
  - Install Flask: `pip install flask`
  - Verify installations: `python -c "import torch; import hmr2; import phalp; print('✓ All imports successful')"`
  - _Requirements: 2_

- [x] 3. Download and Cache 4D-Humans Models
  - Download HMR2 model: `python -c "from hmr2.models import download_model; download_model()"`
  - Download ViTPose model: `python -c "from vitpose.models import download_model; download_model()"`
  - Verify models are cached in `.models/` directory
  - Check model file sizes (HMR2 ~500MB, ViTPose ~100MB)
  - _Requirements: 3_

- [x] 4. Create Flask HTTP Wrapper
  - Create `/home/ben/pose-service/flask_wrapper.py` (use template from SETUP_4D_HUMANS_WITH_PHALP.md)
  - Implement `/health` endpoint that returns model loading status
  - Implement `/pose/hybrid` endpoint that:
    - Accepts base64-encoded frame data
    - Runs HMR2 detection
    - Passes result to PHALP for temporal tracking
    - Returns pose data in JSON format (same as before)
  - Ensure response format matches existing format (backward compatible)
  - Add error handling for invalid requests
  - _Requirements: 4_

- [x] 5. Test Flask Wrapper Locally
  - Start Flask wrapper: `python flask_wrapper.py`
  - Test health endpoint: `curl http://localhost:5000/health`
  - Verify models are loaded (status: "ready")
  - Test with sample frame (create test script)
  - Verify response format matches expected JSON schema
  - _Requirements: 4_

- [x] 6. Verify Process Pool Compatibility
  - Ensure Flask wrapper accepts HTTP requests from existing HTTP wrapper
  - Verify response format is backward compatible (no backend changes needed)
  - Test with ProcessPoolManager (existing code)
  - Verify queue management works (FIFO ordering)
  - Verify concurrency limits are respected
  - _Requirements: 5_

- [x] 7. Test Frame Coverage with Sample Video
  - Upload 140-frame test video to backend
  - Verify all 140 frames are processed (0 frames lost)
  - Check database for 140 pose results
  - Verify frame numbers are sequential (0-139)
  - Compare with previous implementation (should be 140 vs 90)
  - _Requirements: 6_

- [x] 8. Verify Temporal Coherence
  - Render 3D mesh from pose data
  - Verify motion is smooth (no jitter or jumps)
  - Check tracking confidence scores (should be high for detected frames, moderate for predicted)
  - Verify PHALP predictions are smooth transitions
  - _Requirements: 7_

- [x] 9. Performance Testing
  - Measure frame processing time with GPU: should be <500ms per frame
  - Measure first frame time: should be ~30-60s (one-time model load)
  - Measure subsequent frames: should be ~100-250ms per frame
  - Verify GPU memory usage is acceptable (~2-4GB)
  - Log performance metrics
  - _Requirements: 9_

- [x] 10. Backward Compatibility Verification
  - Verify request format is unchanged (same JSON schema)
  - Verify response format is unchanged (same JSON schema)
  - Verify backend code doesn't need changes
  - Verify process pool code doesn't need changes
  - Test with existing backend without modifications
  - _Requirements: 8_

- [x] 11. Monitoring and Diagnostics
  - Verify `/health` endpoint returns correct status
  - Verify logging includes frame processing times
  - Verify logging includes PHALP confidence scores
  - Verify error logging is detailed
  - Test with diagnostics enabled
  - _Requirements: 10_

- [x] 12. Create Startup Script
  - Create `/home/ben/pose-service/start.sh` that:
    - Activates virtual environment
    - Starts Flask wrapper
    - Logs startup messages
  - Make script executable: `chmod +x start.sh`
  - Test startup script
  - _Requirements: 1_

- [x] 13. Documentation and Deployment Guide
  - Document setup process in README
  - Document startup command for Windows
  - Document troubleshooting guide
  - Document performance characteristics
  - Document monitoring endpoints
  - _Requirements: 1, 2, 3_

- [x] 14. Final Integration Test
  - Start Flask wrapper on WSL
  - Start backend on Windows
  - Upload 140-frame video
  - Verify all 140 frames are processed
  - Verify temporal coherence
  - Verify performance is acceptable
  - Verify no backend code changes were needed
  - _Requirements: 5, 6, 7, 8_

## Notes

- **No Backend Changes Required**: The Flask wrapper is a drop-in replacement. The backend code doesn't need to change.
- **Process Pool Compatibility**: The existing `ProcessPoolManager` and `PoseServiceHttpWrapper` work with the new Flask wrapper without modification.
- **Temporal Tracking**: PHALP maintains tracklets across frames, so it needs to process frames sequentially (not in parallel). The process pool handles this by processing one request at a time.
- **Model Caching**: Models are cached on first download, so subsequent requests are fast (~250ms per frame with GPU).
- **Backward Compatibility**: The response format is the same, so the backend doesn't need to change.
- **Performance**: With GPU, expect ~100-250ms per frame. With CPU, expect ~2-5 seconds per frame.

## Success Criteria

1. ✅ 4D-Humans cloned on WSL at `/home/ben/pose-service/4D-Humans`
2. ✅ All dependencies installed (including PHALP)
3. ✅ Models downloaded and cached
4. ✅ Flask wrapper exposes `/pose/hybrid` endpoint
5. ✅ Flask wrapper loads HMR2 and PHALP models
6. ✅ Flask wrapper processes frames and returns pose data
7. ✅ Process pool works with Flask wrapper (no code changes)
8. ✅ 140-frame video results in 140 pose results (0 frames lost)
9. ✅ Temporal coherence maintained (smooth motion)
10. ✅ Performance acceptable (<500ms per frame with GPU)
11. ✅ Backward compatibility maintained (same response format)
12. ✅ Monitoring and diagnostics work

## Timeline

- **Today (1-2 hours)**: Tasks 1-3 (clone, install, download models)
- **Tomorrow (1 hour)**: Tasks 4-6 (create wrapper, test locally, verify compatibility)
- **Day 3 (1-2 hours)**: Tasks 7-11 (test with video, verify coherence, performance, monitoring)
- **Day 4 (30 minutes)**: Tasks 12-14 (documentation, final integration test)

**Total Time**: ~4-5 hours of work spread over 4 days

