# Next Steps: Fixing Frame Loss

## Quick Summary

You're losing 50 frames (36% loss) because:
- Your pose service processes frames **independently**
- When HMR2 fails to detect a person in a frame, that frame is **skipped**
- 4D-Humans doesn't lose frames because **PHALP predicts** when HMR2 fails

## Three Paths Forward

### Path 1: Use Your Interpolation Service (Recommended - Quick Win)

**Status:** You already have `frameInterpolationService.ts` implemented

**What to do:**
1. After pose extraction, you have 90 frames with gaps
2. Use interpolation to fill the 50 missing frames
3. Result: 140 frames (90 detected + 50 interpolated)

**Code location:** `SnowboardingExplained/backend/src/services/frameInterpolation/`

**Implementation:**
```typescript
// In server.ts, after pose extraction
const meshSequence = [...]; // 90 frames with gaps

// Fill gaps with interpolation
const interpolated = await frameInterpolationService.interpolateGaps(
  meshSequence,
  140  // total frames
);

// Result: 140 frames
```

**Effort:** Low (already implemented)
**Quality:** Good (motion-based interpolation)
**Time:** 30 minutes

---

### Path 2: Add PHALP Tracking to WSL Service (Best Long-Term)

**Status:** Requires understanding what's running on WSL

**What to do:**
1. SSH into WSL and check what's running
2. If it's just HMR2, add PHALP tracking
3. Modify Flask app to use PHALP
4. Result: Perfect frame coverage (like 4D-Humans demo)

**First, verify what's running:**
```bash
# SSH into WSL
wsl

# Check the pose service
cd /home/ben/pose-service
ls -la
cat app.py | head -50

# Check installed packages
pip list | grep -i "phalp\|4d\|hmr"

# Check if PHALP is available
python -c "import phalp; print('PHALP installed')"
```

**If PHALP is not installed:**
```bash
# Install PHALP
pip install git+https://github.com/brjathu/PHALP.git

# Modify app.py to use PHALP tracking
# (See 4D-Humans track.py for reference)
```

**Effort:** Medium (requires PHALP knowledge)
**Quality:** Perfect (same as 4D-Humans demo)
**Time:** 2-4 hours

---

### Path 3: Use 4D-Humans Directly (Easiest)

**Status:** 4D-Humans is open source and ready to use

**What to do:**
1. Clone 4D-Humans on WSL
2. Run their tracking pipeline on your video
3. Extract poses from their output
4. Store in your database

**Implementation:**
```bash
# In WSL
cd /home/ben/pose-service
git clone https://github.com/shubham-goel/4D-Humans.git
cd 4D-Humans

# Install PHALP
pip install git+https://github.com/brjathu/PHALP.git

# Run tracking on your video
python track.py --video /path/to/video.mp4 --output ./outputs

# Extract poses from output
python extract_poses.py ./outputs/tracklets.pkl
```

**Effort:** Low (just use their code)
**Quality:** Perfect (their code)
**Time:** 1-2 hours

---

## Recommendation

### For Now (Quick Fix)

**Use Path 1: Your Interpolation Service**

You already have it implemented. Just integrate it into the upload flow:

```typescript
// In server.ts, after pose extraction
if (meshSequence.length < frameResult.frameCount) {
  console.log(`[UPLOAD] Filling ${frameResult.frameCount - meshSequence.length} missing frames with interpolation`);
  
  const interpolated = await frameInterpolationService.interpolateGaps(
    meshSequence,
    frameResult.frameCount
  );
  
  meshSequence = interpolated;
  console.log(`[UPLOAD] ✓ Interpolation complete: ${meshSequence.length} frames`);
}
```

**Time:** 30 minutes
**Result:** 140 frames instead of 90

### For Later (Best Solution)

**Use Path 2 or 3: Add PHALP Tracking**

Once you verify what's running on WSL, add proper temporal tracking:
- If it's just HMR2: Add PHALP to the Flask app
- If it's already 4D-Humans: Check if PHALP is enabled

**Time:** 2-4 hours
**Result:** Perfect frame coverage with temporal coherence

---

## Action Items

### Immediate (Today)

- [ ] Integrate interpolation into upload flow
- [ ] Test with your 140-frame video
- [ ] Verify you get 140 frames instead of 90

### Short-term (This Week)

- [ ] SSH into WSL and check what's running
- [ ] Verify if PHALP is available
- [ ] Plan Path 2 or 3 implementation

### Long-term (Next Sprint)

- [ ] Implement PHALP tracking or use 4D-Humans directly
- [ ] Remove interpolation (no longer needed)
- [ ] Get perfect frame coverage

---

## Files to Modify

### For Path 1 (Interpolation)

**File:** `SnowboardingExplained/backend/src/server.ts`

**Location:** Around line 750 (after pose extraction)

**Change:**
```typescript
// BEFORE
console.log(`[UPLOAD] Successfully processed ${meshSequence.length}/${framesToProcess.length} frames with pose data`);

// AFTER
console.log(`[UPLOAD] Successfully processed ${meshSequence.length}/${framesToProcess.length} frames with pose data`);

// Fill gaps with interpolation if needed
if (meshSequence.length < frameResult.frameCount) {
  console.log(`[UPLOAD] Filling ${frameResult.frameCount - meshSequence.length} missing frames with interpolation`);
  
  try {
    const interpolated = await frameInterpolationService.interpolateGaps(
      meshSequence,
      frameResult.frameCount
    );
    
    meshSequence = interpolated;
    console.log(`[UPLOAD] ✓ Interpolation complete: ${meshSequence.length} frames`);
  } catch (err) {
    console.warn(`[UPLOAD] Interpolation failed, continuing with ${meshSequence.length} frames:`, err);
    logger.warn('Frame interpolation failed', { error: err });
  }
}
```

### For Path 2 (PHALP on WSL)

**File:** `/home/ben/pose-service/app.py` (on WSL)

**Change:** Add PHALP tracking to the pose detection pipeline

### For Path 3 (Use 4D-Humans)

**File:** New script on WSL to extract poses from 4D-Humans output

---

## Testing

### Test Path 1 (Interpolation)

```bash
# Upload your 140-frame video
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"

# Check the response
# Should show: "frameCount": 140 (not 90)

# Verify in database
db.mesh_data.findOne({videoId: "..."})
# Should have 140 frames
```

### Test Path 2 (PHALP)

```bash
# Check if PHALP is working
python -c "import phalp; print('PHALP OK')"

# Run tracking on test video
python track.py --video test.mp4 --output ./outputs

# Check output
ls -la ./outputs/
# Should have tracklets.pkl
```

### Test Path 3 (4D-Humans)

```bash
# Check if 4D-Humans is working
python -c "from hmr2 import HMR2; print('HMR2 OK')"

# Run tracking
python track.py --video test.mp4 --output ./outputs

# Check output
ls -la ./outputs/
# Should have tracklets.pkl and video.mp4
```

---

## FAQ

**Q: Why not just use 4D-Humans directly?**
A: You could! But you already have interpolation implemented, so Path 1 is a quick win. Path 3 is better long-term.

**Q: Will interpolation look good?**
A: Yes! Your interpolation uses motion-based prediction, which is similar to what PHALP does. It should look smooth.

**Q: How long will this take?**
A: Path 1: 30 minutes. Path 2: 2-4 hours. Path 3: 1-2 hours.

**Q: Which path should I choose?**
A: Start with Path 1 (quick win). Then do Path 2 or 3 (better solution).

**Q: Will I lose quality?**
A: No! Interpolated frames will have lower confidence, but they'll be smooth and continuous.

**Q: Can I do all three?**
A: Yes! Path 1 is a quick fix. Path 2/3 is a better long-term solution. You can do both.

---

## Summary

You're losing frames because **HMR2 fails on some frames and you have no recovery mechanism**.

**Quick fix:** Use your interpolation service (30 minutes)
**Better fix:** Add PHALP tracking (2-4 hours)
**Best fix:** Use 4D-Humans directly (1-2 hours)

Choose your path and let's get all 140 frames!
