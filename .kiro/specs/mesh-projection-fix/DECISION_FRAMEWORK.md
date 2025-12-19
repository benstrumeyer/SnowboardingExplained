# Mesh Projection Fix - Decision Framework

## The Problem (Diagnosed)

Your mesh doesn't align because you're projecting SMPL vertices **directly to image space** when they're actually defined in **crop space**.

4D-Humans does this:
```
Tight bbox → Crop image → HMR2 predicts in crop space → Reproject to image
```

You're doing this:
```
Full image → HMR2 predicts in crop space → Project directly to image (WRONG)
```

**Result**: Mesh floats, shrinks, drifts. Pose looks right, position is wrong.

---

## Three Paths to Fix

### 🟢 PATH A: Crop-Aware Projection (RECOMMENDED)

**What**: Implement the correct projection math that transforms from crop space to image space.

**Code change** (pseudocode):
```python
# BEFORE (wrong)
x_pixel = focal_length * x_3d / z_3d + w/2

# AFTER (correct)
x_crop = s * x_3d + tx                    # Weak-perspective in crop space
x_pixel = (x_crop + 1) * crop_w/2 + x1    # Map to image space
```

**Pros**:
- ✅ Fixes the core issue
- ✅ Works without ViTDet
- ✅ Can validate against 4D-Humans reference
- ✅ Fast to implement (2-3 hours)
- ✅ Low maintenance burden

**Cons**:
- ⚠️ Still uses full-image bbox fallback (not ideal for extreme poses)
- ⚠️ Alignment might be imperfect if bbox is bad

**When to choose**: You want the fix NOW and are willing to iterate if needed.

**Success looks like**: Mesh keypoints align with skeleton keypoints. No drift across frames.

---

### 🟡 PATH B: Crop-Aware + Keypoint Bbox (ROBUST)

**What**: Implement crop-aware projection + compute tight bbox from detected keypoints.

**Code change** (pseudocode):
```python
# Get keypoints from pose detection
keypoints_2d = detect_pose(frame)

# Compute tight bbox from keypoints
bbox = bbox_from_keypoints(keypoints_2d, margin=0.2)

# Use correct projection with tight bbox
vertices_2d = project_smpl_crop_to_image(vertices, camera, bbox, img_size)
```

**Pros**:
- ✅ Fixes projection math
- ✅ Improves bbox detection
- ✅ Handles extreme poses better
- ✅ Still works without ViTDet
- ✅ More robust than Path A

**Cons**:
- ⚠️ More complex (4-5 hours)
- ⚠️ Depends on pose detection quality
- ⚠️ Keypoint detection might fail on some frames

**When to choose**: Path A works but alignment is imperfect on aerial spins or extreme poses.

**Success looks like**: Mesh stays on rider even during 720s and backflips.

---

### 🔴 PATH C: Crop-Aware + ViTDet (IDEAL)

**What**: Implement crop-aware projection + get ViTDet working on Windows.

**Code change** (pseudocode):
```python
# Use ViTDet for tight person detection
bbox = vitdet_detector(frame)

# Use correct projection with ViTDet bbox
vertices_2d = project_smpl_crop_to_image(vertices, camera, bbox, img_size)
```

**Pros**:
- ✅ Matches 4D-Humans demo exactly
- ✅ Best detection quality
- ✅ Handles all poses correctly
- ✅ Reference implementation

**Cons**:
- ❌ ViTDet requires detectron2 (complex build on Windows)
- ❌ Might need WSL or Docker
- ❌ Longest implementation (6-8 hours)
- ❌ Highest maintenance burden

**When to choose**: You need production-grade quality and have time to set up ViTDet.

**Success looks like**: Identical results to 4D-Humans demo.

---

## Decision Matrix

| Factor | Path A | Path B | Path C |
|--------|--------|--------|--------|
| **Fixes alignment** | ✅ | ✅ | ✅ |
| **Works without ViTDet** | ✅ | ✅ | ❌ |
| **Handles extreme poses** | ⚠️ | ✅ | ✅ |
| **Matches demo exactly** | ✅ | ✅ | ✅ |
| **Time to working** | 2-3h | 4-5h | 6-8h |
| **Setup complexity** | Low | Medium | High |
| **Maintenance burden** | Low | Medium | High |
| **Can iterate later** | ✅ → B/C | ✅ → C | ❌ |

---

## Recommendation

### **Start with PATH A**

**Why**:
1. **Fixes the root cause** - projection math is wrong, not detection
2. **Validates diagnosis** - if Path A works, you know the problem was projection
3. **Fast feedback** - 2-3 hours to working solution
4. **Low risk** - can always upgrade to B or C later
5. **Unblocks testing** - can test against 4D-Humans reference immediately

### **Upgrade to PATH B if**:
- Path A works but alignment drifts on extreme poses
- You want better robustness without ViTDet setup
- Keypoint detection is reliable enough

### **Upgrade to PATH C if**:
- Path B works but detection fails on some frames
- You need production-grade quality
- You have time to set up ViTDet

---

## Implementation Checklist (Path A)

- [ ] Create `project_smpl_crop_to_image()` function
- [ ] Update `simple_mesh_renderer.py` to use crop-aware projection
- [ ] Add debug visualization (bbox + keypoints + mesh)
- [ ] Test projection math with known inputs
- [ ] Compare with 4D-Humans reference on test frame
- [ ] Verify mesh keypoints align with skeleton
- [ ] Test across multiple frames (no drift)
- [ ] Document any differences from reference

---

## Next Steps

1. **Approve this decision framework** - confirm Path A is the right choice
2. **Create tasks.md** - break Path A into concrete coding tasks
3. **Implement Path A** - 2-3 hours of focused work
4. **Validate** - compare with 4D-Humans demo
5. **Decide on upgrade** - Path B or C if needed

---

## Questions to Answer Before Starting

1. **Do you want to start with Path A?** (Recommended)
2. **Do you have time for Path B/C later if needed?**
3. **Should we set up ViTDet now or defer to Path C?**
4. **Do you want me to create tasks.md for Path A?**

Choose your path and we'll build the implementation plan.
