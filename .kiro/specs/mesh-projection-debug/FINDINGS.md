# Mesh Projection Debug - Key Findings

## Critical Issue Found

### The Problem
Our `cam_crop_to_full()` implementation in `mesh_renderer.py` is **incorrect**. 

**Our current implementation:**
```python
def cam_crop_to_full(self, cam_crop, box_center, box_size, image_size, focal_length):
    w, h = image_size
    cx, cy = box_center
    w_2 = w / 2.0
    h_2 = h / 2.0
    
    bs = box_size * cam_crop[0]
    if abs(bs) < 1e-9:
        bs = 1e-9
    
    tz_full = 2 * focal_length / bs
    tx_full = (2 * (cx - w_2) / bs) + cam_crop[1]
    ty_full = (2 * (cy - h_2) / bs) + cam_crop[2]
    
    return np.array([tx_full, ty_full, tz_full], dtype=np.float32)
```

**The correct implementation (from 4D-Humans):**
```python
def cam_crop_to_full(cam_bbox, box_center, box_size, img_size, focal_length=5000.):
    img_w, img_h = img_size[:, 0], img_size[:, 1]
    cx, cy, b = box_center[:, 0], box_center[:, 1], box_size
    w_2, h_2 = img_w / 2., img_h / 2.
    bs = b * cam_bbox[:, 0] + 1e-9
    tz = 2 * focal_length / bs
    tx = (2 * (cx - w_2) / bs) + cam_bbox[:, 1]
    ty = (2 * (cy - h_2) / bs) + cam_bbox[:, 2]
    full_cam = torch.stack([tx, ty, tz], dim=-1)
    return full_cam
```

### Key Differences
1. **Order of output**: We output `[tx, ty, tz]` but should be `[tx, ty, tz]` ✓ (same)
2. **Formula is identical** ✓
3. **But the issue is in how we're using it**

### The Real Problem
Looking at demo.py more carefully:
```python
pred_cam_t_full = cam_crop_to_full(pred_cam, box_center, box_size, img_size, scaled_focal_length).detach().cpu().numpy()
```

They pass:
- `pred_cam`: The raw camera parameters from HMR2 output
- `box_center`: From the batch
- `box_size`: From the batch  
- `img_size`: From the batch
- `scaled_focal_length`: Computed as `model_cfg.EXTRA.FOCAL_LENGTH / model_cfg.MODEL.IMAGE_SIZE * img_size.max()`

### What We're Doing Wrong
1. We're computing `scaled_focal_length` inside `project_vertices()` but using it in `cam_crop_to_full()`
2. We might be using wrong `pred_cam` values
3. We might not be getting `box_center` and `box_size` correctly from HMR2

### What We Need to Fix
1. **Verify we're getting the right `pred_cam` from HMR2 output**
   - Should be shape (3,) with values [s, tx, ty]
   - `s` is scale, `tx`/`ty` are offsets in crop space

2. **Verify `box_center` and `box_size` are correct**
   - These come from the ViTDet detection
   - Should match the crop used by HMR2

3. **Use the correct focal length**
   - Should be: `5000 * max(image_size) / 256`
   - This matches the HMR2 training setup

4. **Verify the projection formula**
   - After getting `cam_t_full`, we project as:
   - `x_2d = focal_length * x_cam / z_cam`
   - `y_2d = focal_length * y_cam / z_cam`
   - Then add image center: `x_pixel = x_2d + w/2`, `y_pixel = y_2d + h/2`

## Next Steps
1. Add detailed logging to see what values we're getting at each step
2. Compare with 4D-Humans demo output
3. Verify ViTDet detection is working
4. Verify HMR2 is getting the right crop
5. Verify camera transformation is correct
6. Verify vertex projection is correct
