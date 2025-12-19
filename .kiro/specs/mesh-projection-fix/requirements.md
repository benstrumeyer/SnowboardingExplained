# Mesh Projection Alignment Fix - Requirements

## Introduction

The SMPL mesh overlay is misaligned because the projection math doesn't match 4D-Humans' crop-aware pipeline. The demo works because it uses: tight person bbox → crop/resize → HMR2 prediction in crop space → reproject to image space. Our pipeline skips the crop-space math, causing the mesh to float/shrink/drift.

This spec defines three implementation paths with trade-offs, ranked by correctness vs. complexity.

## Glossary

- **Weak-perspective camera**: (s, tx, ty) where s=scale, tx/ty=translation in normalized space
- **Crop space**: Normalized [-1, 1] coordinates relative to person bbox
- **Image space**: Pixel coordinates in full frame
- **ViTDet**: Vision Transformer detector for tight person bounding boxes
- **Bbox**: Bounding box [x1, y1, x2, y2] in image pixels
- **Projection math**: The transformation from 3D SMPL vertices → 2D image pixels

## Requirements

### Requirement 1: Understand Current Misalignment

**User Story:** As a developer, I want to understand exactly why the mesh doesn't align, so that I can choose the right fix.

#### Acceptance Criteria

1. WHEN analyzing the current pipeline THEN the system SHALL identify that vertices are projected directly to full image space without crop-space transformation
2. WHEN comparing to 4D-Humans demo THEN the system SHALL document that demo uses: ViTDet bbox → crop/resize → HMR2 (crop space) → reproject to image
3. WHEN examining camera parameters THEN the system SHALL confirm that (s, tx, ty) are defined in crop space, not pixel space
4. WHEN testing with full-image bbox fallback THEN the system SHALL demonstrate that mesh scales down because camera scale s is conditioned on crop size, not full image

### Requirement 2: Implement Crop-Aware Projection (CRITICAL PATH)

**User Story:** As a developer, I want to project SMPL vertices using the correct crop-space math, so that the mesh aligns with the rider.

#### Acceptance Criteria

1. WHEN given SMPL vertices, weak-perspective camera (s, tx, ty), and bbox THEN the system SHALL transform vertices from crop space to image space using: px = (s*x + tx + 1) * crop_w/2 + x1, py = (s*y + ty + 1) * crop_h/2 + y1
2. WHEN projecting vertices THEN the system SHALL correctly handle the [-1, 1] normalized crop space to pixel space mapping
3. WHEN rendering with correct projection THEN the system SHALL produce mesh that aligns with skeleton keypoints
4. WHEN testing across multiple frames THEN the system SHALL maintain consistent alignment regardless of rider position in frame

### Requirement 3: Improve Bbox Detection (FALLBACK PATH)

**User Story:** As a developer, I want to detect a tight person bbox when ViTDet is unavailable, so that camera scale is conditioned correctly.

#### Acceptance Criteria

1. WHEN ViTDet is unavailable THEN the system SHALL use MediaPipe/OpenPose keypoints to compute bbox bounds
2. WHEN computing bbox from keypoints THEN the system SHALL add 20% margin around detected joints to ensure full body is captured
3. WHEN using keypoint-derived bbox THEN the system SHALL produce better alignment than full-image fallback
4. WHEN bbox is computed THEN the system SHALL log bbox dimensions and verify it's tighter than full image

### Requirement 4: Debug Visualization (VALIDATION PATH)

**User Story:** As a developer, I want to visualize intermediate steps, so that I can verify projection math is correct.

#### Acceptance Criteria

1. WHEN rendering frame THEN the system SHALL draw detected bbox as green rectangle
2. WHEN rendering frame THEN the system SHALL draw projected 2D keypoints as red circles
3. WHEN rendering frame THEN the system SHALL draw mesh overlay in green
4. WHEN keypoints align but mesh doesn't THEN the system SHALL indicate face ordering or depth issue
5. WHEN neither keypoints nor mesh align THEN the system SHALL indicate camera math is wrong

### Requirement 5: Validate Against 4D-Humans Reference

**User Story:** As a developer, I want to verify my projection matches 4D-Humans exactly, so that I have confidence in correctness.

#### Acceptance Criteria

1. WHEN comparing projection code THEN the system SHALL match 4D-Humans' cam_crop_to_full transformation exactly
2. WHEN testing on same frame as demo THEN the system SHALL produce identical 2D keypoint projections
3. WHEN rendering mesh THEN the system SHALL produce visually identical overlay to 4D-Humans demo
4. WHEN documenting differences THEN the system SHALL explain any intentional deviations from reference

## Implementation Paths (Ranked by Correctness)

### Path A: Full Crop-Aware Projection (RECOMMENDED)
- **Correctness**: ✅✅✅ (matches 4D-Humans exactly)
- **Complexity**: Medium
- **Time**: 2-3 hours
- **Requirements**: 2, 4, 5
- **Steps**:
  1. Implement crop-space projection math
  2. Add debug visualization
  3. Validate against reference
  4. Test on multiple frames

### Path B: Crop-Aware + Keypoint Bbox (ROBUST)
- **Correctness**: ✅✅✅ (correct math + better detection)
- **Complexity**: High
- **Time**: 4-5 hours
- **Requirements**: 2, 3, 4, 5
- **Steps**:
  1. Implement keypoint-based bbox detection
  2. Implement crop-space projection
  3. Add debug visualization
  4. Validate both components

### Path C: Crop-Aware + ViTDet (IDEAL)
- **Correctness**: ✅✅✅ (matches demo exactly)
- **Complexity**: Very High
- **Time**: 6-8 hours (includes ViTDet setup)
- **Requirements**: 1, 2, 3, 4, 5
- **Steps**:
  1. Get ViTDet working on Windows (WSL or alternative)
  2. Implement crop-space projection
  3. Integrate ViTDet detection
  4. Add debug visualization
  5. Validate against reference

## Decision Matrix

| Factor | Path A | Path B | Path C |
|--------|--------|--------|--------|
| Fixes alignment | ✅ | ✅ | ✅ |
| Works without ViTDet | ✅ | ✅ | ❌ |
| Matches demo exactly | ✅ | ✅ | ✅ |
| Handles extreme poses | ⚠️ | ✅ | ✅ |
| Setup complexity | Low | Medium | High |
| Time to working | 2-3h | 4-5h | 6-8h |
| Maintenance burden | Low | Medium | High |

## Recommendation

**Start with Path A (Crop-Aware Projection)** because:
1. Fixes the core issue (projection math)
2. Works immediately without ViTDet
3. Can be extended to Path B later if needed
4. Validates that the problem is indeed projection, not detection
5. Provides foundation for Path C if ViTDet becomes available

If Path A works but alignment is still imperfect on extreme poses → upgrade to Path B.
If Path B works but detection fails on some frames → upgrade to Path C.

## Success Criteria

- [ ] Mesh keypoints align with skeleton keypoints (within 5 pixels)
- [ ] Mesh overlay stays on rider across multiple frames
- [ ] No mesh drift/float/shrink artifacts
- [ ] Debug visualization confirms projection math is correct
- [ ] Code matches 4D-Humans reference implementation
