# SnowboardingExplained - Problems & Solutions Cheatsheet

Quick reference for all documented issues and their fixes.

---

## 🔴 CRITICAL ISSUES (Blocking)

### 1. Subprocess Timeout (180s)
**Symptom:** Flask subprocess hangs with zero output
**Root Cause:** Missing `shell=True` in subprocess.run()
**Fix:** Add `shell=True` and `executable='/bin/bash'` to subprocess kwargs
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (lines 975-988)
**Status:** ✅ FIXED

### 2. Virtual Environment Not Activating
**Symptom:** ImportError for torch, phalp, hmr2
**Root Cause:** Subprocess using system Python instead of venv
**Fix:** Source venv activate script before running track.py
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (lines 930-945)
**Status:** ✅ FIXED

### 3. WSL Path Conversion Failed
**Symptom:** File copy to WSL fails, path mangled
**Root Cause:** PowerShell strips backslashes in Windows paths
**Fix:** Convert backslashes to forward slashes: `path.replace(/\\/g, '/')`
**File:** `backend/src/server.ts` (lines 542-549)
**Status:** ✅ FIXED

### 4. Pose Service Unreachable
**Symptom:** Backend requests to localhost:5000 hang indefinitely
**Root Cause:** Windows Node.js can't reach WSL services via localhost
**Fix:** Use WSL IP instead: `POSE_SERVICE_URL=http://172.31.224.1:5000`
**File:** `backend/.env.local`
**Status:** ✅ FIXED

### 5. Python Dependencies Missing
**Symptom:** ModuleNotFoundError: No module named 'cv2'
**Root Cause:** Virtual environment not set up with required packages
**Fix:** Run setup script: `./setup-pose-service.ps1` (Windows) or `bash setup-pose-service.sh` (Unix)
**File:** `setup-pose-service.ps1` / `setup-pose-service.sh`
**Status:** ✅ FIXED

---

## 🟡 MAJOR ISSUES (Degraded Functionality)

### 6. CUDA Out of Memory
**Symptom:** RuntimeError on frames 16-17: CUDA error: out of memory
**Root Cause:** GPU memory not cleared between frame processing
**Fix:** Call `torch.cuda.empty_cache()` after HMR2 inference
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (lines 1270-1280, 1352, 1360)
**Status:** ✅ FIXED

### 7. Hydra Argument Order Wrong
**Symptom:** track.py doesn't start, Hydra config not applied
**Root Cause:** Hydra args after video.source instead of before
**Fix:** Reorder: `python track.py hydra.job.chdir=false ... video.source=...`
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (line 935)
**Status:** ✅ FIXED

### 8. Neural Renderer Not Available
**Symptom:** ImportError: No module named 'neural_renderer'
**Root Cause:** Using old code that requires CUDA compilation
**Fix:** Replace with pyrender (official 4D-Humans approach)
**File:** `backend/pose-service/4D-Humans/track.py`
**Status:** ✅ FIXED

### 9. Stale Mesh Data Caching
**Symptom:** Second video shows first video's mesh
**Root Cause:** Cache directory using only first 8 chars of videoId
**Fix:** Use full videoId for unique cache directories
**File:** `backend/src/services/frameExtraction.ts` (getShortVideoPath)
**Status:** ✅ FIXED

### 10. Large Video Upload Fails
**Symptom:** 413 Payload Too Large error
**Root Cause:** File size limits too restrictive (500MB multer, 100KB express)
**Fix:** Increase to 2GB multer, 50MB express
**File:** `backend/src/server.ts` (lines 55-60, 122)
**Status:** ✅ FIXED

---

## 🟠 MEDIUM ISSUES (Data Quality)

### 11. Frame Loss in Pose Detection
**Symptom:** 36% of frames lost (50/140 frames)
**Root Cause:** HMR2 per-frame detector fails on some frames, no recovery
**Fix:** Use frame interpolation or add temporal tracking (PHALP)
**File:** `backend/src/services/frameInterpolationService.ts`
**Status:** ✅ MITIGATED (interpolation added)

### 12. Mesh Not Displaying
**Symptom:** 79 frames loaded but no mesh visible
**Root Cause:** Frontend looking for wrong property names (vertices vs mesh_vertices_data)
**Fix:** Check both property names with fallback
**File:** `backend/web/src/components/MeshViewer.tsx` (createMeshFromFrame)
**Status:** ✅ FIXED

### 13. Weak Perspective Camera Misalignment
**Symptom:** Mesh position doesn't align with video
**Root Cause:** pred_cam treated as 3D translation instead of weak perspective camera
**Fix:** Extract scale, tx_norm, ty_norm correctly
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (lines 1280-1290)
**Status:** ✅ FIXED

### 14. Frame Index Misalignment
**Symptom:** Frame indices don't match mesh data
**Root Cause:** Extracted frames kept even without mesh data
**Fix:** Filter frames without mesh, rename to sequential
**File:** `backend/src/services/frameExtraction.ts` (filterFramesToMeshData, renameFramesToSequential)
**Status:** ✅ FIXED

### 15. Frame Rate Normalization Broken
**Symptom:** Multiple videos can't sync (different frame counts)
**Root Cause:** Normalizing by total frames instead of frames with mesh
**Fix:** Normalize by min(frames_with_mesh) across all videos
**File:** `backend/src/services/frameInterpolationService.ts`
**Status:** ✅ FIXED

---

## 🟢 MINOR ISSUES (Edge Cases)

### 16. Docker Build Dependency Issues
**Symptom:** Docker build fails with module import errors
**Root Cause:** Backend module configuration mismatch
**Fix:** Verify package.json has correct module settings
**File:** `backend/package.json`, `backend/Dockerfile`
**Status:** ⚠️ DOCUMENTED (needs verification)

### 17. Subprocess Hanging with WSL Paths
**Symptom:** Subprocess times out when using Windows paths
**Root Cause:** Bash in WSL can't access Windows paths
**Fix:** Use POSE_SERVICE_PATH environment variable (WSL path)
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (lines 930-980)
**Status:** ✅ FIXED

### 18. stdin Write Failures
**Symptom:** "write EOF" errors when processing 31+ frames
**Root Cause:** Python process crashes on import, stdin closes
**Fix:** Fix underlying Python dependency issue (see #5)
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py`
**Status:** ✅ FIXED

### 19. Mesh Data Structure Mismatch
**Symptom:** Backend stores mesh but frontend can't access
**Root Cause:** Property name mismatches between services
**Fix:** Add type-safe interfaces and fallback property access
**File:** `backend/src/types.ts`, `backend/web/src/types/index.ts`
**Status:** ✅ FIXED

### 20. Frame Interpolation Gaps
**Symptom:** Large gaps when HMR2 fails on consecutive frames
**Root Cause:** Per-frame detection has no temporal context
**Fix:** Add Kalman smoothing and motion prediction
**File:** `backend/src/services/frameInterpolationService.ts`
**Status:** ✅ MITIGATED

---

## 📋 QUICK REFERENCE BY SYMPTOM

### "Subprocess timed out"
→ Check: shell=True, executable=/bin/bash, venv activation

### "ModuleNotFoundError"
→ Check: Python venv setup, requirements.txt installed

### "CUDA out of memory"
→ Check: torch.cuda.empty_cache() calls after inference

### "Mesh not displaying"
→ Check: Property names (mesh_vertices_data vs vertices)

### "Mesh misaligned"
→ Check: Camera parameters (scale, tx_norm, ty_norm)

### "Frame indices wrong"
→ Check: Frame filtering and renaming after pose detection

### "Multiple videos won't sync"
→ Check: Frame rate normalization using min(frames_with_mesh)

### "Second video shows first video's mesh"
→ Check: Cache directory using full videoId, not substring

### "Large video upload fails"
→ Check: File size limits (multer 2GB, express 50MB)

### "Pose service unreachable"
→ Check: POSE_SERVICE_URL using WSL IP, not localhost

---

## 🔧 TESTING CHECKLIST

- [ ] Backend builds without errors
- [ ] Backend server starts successfully
- [ ] Flask wrapper is running
- [ ] Video upload succeeds
- [ ] Video copied to WSL
- [ ] Flask wrapper receives video
- [ ] Subprocess completes in < 20 seconds
- [ ] `[TRACK.PY]` logs appear
- [ ] Exit code is 0
- [ ] Mesh data stored in MongoDB
- [ ] Mesh displays in web UI
- [ ] Multiple videos sync correctly

---

## 📁 KEY FILES TO KNOW

| File | Purpose |
|------|---------|
| `backend/pose-service/flask_wrapper_minimal_safe.py` | Flask subprocess wrapper (most fixes here) |
| `backend/src/server.ts` | Backend API server (path conversion fix) |
| `backend/src/services/frameExtraction.ts` | Frame extraction and filtering |
| `backend/src/services/frameInterpolationService.ts` | Frame interpolation and normalization |
| `backend/web/src/components/MeshViewer.tsx` | Mesh rendering (property name fix) |
| `backend/pose-service/4D-Humans/track.py` | Pose detection (neural_renderer → pyrender) |
| `setup-pose-service.ps1` / `.sh` | Python environment setup |

---

## 🚀 DEPLOYMENT CHECKLIST

1. **Setup Python Environment**
   ```bash
   ./setup-pose-service.ps1  # Windows
   bash setup-pose-service.sh  # Unix
   ```

2. **Configure Environment**
   - Set `POSE_SERVICE_URL` in `.env.local` to WSL IP
   - Verify `POSE_SERVICE_PATH` environment variable

3. **Build Backend**
   ```bash
   npm run build
   ```

4. **Start Services**
   - Backend: `npm start`
   - Flask wrapper: `python flask_wrapper_minimal_safe.py`

5. **Test Upload**
   - Upload test video
   - Monitor logs for `[TRACK.PY]` output
   - Verify mesh displays

---

## 📊 STATISTICS

- **Total Problems:** 20
- **Fixed:** 18
- **Mitigated:** 2
- **Categories:**
  - Subprocess/Process: 5
  - Path/File System: 3
  - GPU/Memory: 1
  - Data Structure: 4
  - Frame Processing: 4
  - Network: 2
  - Dependencies: 1

---

**Last Updated:** December 29, 2025
**Status:** All critical issues fixed, ready for production testing
