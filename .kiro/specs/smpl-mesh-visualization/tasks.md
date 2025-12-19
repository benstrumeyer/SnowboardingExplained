# Implementation Plan: SMPL Mesh Visualization

- [x] 1. Set up mesh rendering module structure


  - Create `mesh_renderer.py` with modular component classes
  - Define MeshData, ProjectionResult, RenderingResult dataclasses
  - Set up error handling and logging infrastructure
  - _Requirements: 1.1, 2.1_

- [ ] 2. Implement mesh data extraction
  - [x] 2.1 Extract mesh vertices and faces from HMR2 output


    - Implement `extract_mesh_data(hmr2_output)` function
    - Validate 6890 vertices and 13776 faces structure
    - Handle missing or invalid mesh data gracefully
    - _Requirements: 1.1_

  - [ ]* 2.2 Write property test for mesh extraction completeness
    - **Feature: smpl-mesh-visualization, Property 1: Mesh Data Extraction Completeness**
    - **Validates: Requirements 1.1**

- [ ] 3. Implement camera projection
  - [x] 3.1 Implement cam_crop_to_full transformation

    - Implement `cam_crop_to_full(cam_crop, box_center, box_size, img_size, focal_length)` function
    - Apply exact formula: tx_full = (2 * (cx - w/2) / bs) + cam_crop.tx
    - Handle edge cases (zero division, invalid parameters)
    - _Requirements: 5.1_

  - [x] 3.2 Implement focal length scaling

    - Implement `compute_scaled_focal_length(base_focal, image_size)` function
    - Apply formula: scaled_focal = 5000 * image_size / 256
    - Verify scaling across different resolutions
    - _Requirements: 5.2_

  - [x] 3.3 Implement perspective projection

    - Implement `project_vertices(vertices_3d, cam_t, focal_length, img_size)` function
    - Apply perspective projection formula: x_pixel = focal * (x_3d + tx) / (z_3d + tz) + w/2
    - Clamp out-of-bounds pixels to image bounds
    - Return both 2D coordinates and z-depths
    - _Requirements: 1.2, 5.3_

  - [ ]* 3.4 Write property test for perspective projection
    - **Feature: smpl-mesh-visualization, Property 2: Perspective Projection Correctness**
    - **Validates: Requirements 1.2, 5.3**

  - [ ]* 3.5 Write property test for focal length scaling
    - **Feature: smpl-mesh-visualization, Property 15: Focal Length Scaling**
    - **Validates: Requirements 5.2**

  - [ ]* 3.6 Write property test for cam_crop_to_full transformation
    - **Feature: smpl-mesh-visualization, Property 14: cam_crop_to_full Transformation**
    - **Validates: Requirements 5.1**

- [ ] 4. Implement depth sorting
  - [x] 4.1 Implement face depth computation

    - Implement `compute_face_depths(faces, z_depths)` function
    - Compute average z-depth for each face
    - Handle degenerate faces (zero area)
    - _Requirements: 1.3, 4.3_

  - [x] 4.2 Implement back-to-front face sorting

    - Implement `sort_faces_back_to_front(faces, face_z_depths)` function
    - Sort faces by ascending z-depth
    - Return sorted face indices
    - _Requirements: 1.3, 4.3_

  - [ ]* 4.3 Write property test for depth sorting
    - **Feature: smpl-mesh-visualization, Property 3: Depth Sorting Consistency**
    - **Validates: Requirements 1.3, 4.3**

- [ ] 5. Implement triangle rasterization
  - [x] 5.1 Implement triangle rasterization algorithm

    - Implement `rasterize_triangle(v0, v1, v2, H, W)` function
    - Use barycentric coordinates for point-in-triangle test
    - Return list of pixels inside triangle
    - Handle edge cases (degenerate triangles, out-of-bounds)
    - _Requirements: 1.3_

  - [x] 5.2 Implement alpha blending

    - Implement `blend_pixel(bg_color, fg_color, alpha)` function
    - Apply formula: output = fg_color * alpha + bg_color * (1 - alpha)
    - Clamp color values to [0, 255]
    - _Requirements: 4.2_

  - [x] 5.3 Implement mesh rendering

    - Implement `render_mesh(image, vertices_2d, sorted_faces, color, alpha)` function
    - Iterate through sorted faces in order
    - Rasterize each triangle and blend with image
    - Apply light blue color (RGB: 166, 189, 219)
    - Apply 60% opacity (alpha = 0.6)
    - _Requirements: 1.3, 4.1, 4.2, 4.3_

  - [ ]* 5.4 Write property test for alpha blending
    - **Feature: smpl-mesh-visualization, Property 13: Alpha Blending Correctness**
    - **Validates: Requirements 4.2**

  - [ ]* 5.5 Write property test for mesh color accuracy
    - **Feature: smpl-mesh-visualization, Property 12: Mesh Color Accuracy**
    - **Validates: Requirements 4.1**

- [ ] 6. Implement error handling and fallbacks
  - [x] 6.1 Implement library availability detection


    - Check for PyTorch3D availability (optional)
    - Detect missing rendering libraries gracefully
    - Log warnings for unavailable libraries
    - _Requirements: 2.1, 2.3_

  - [x] 6.2 Implement fallback to software rasterization

    - Ensure software rasterization works without PyTorch3D
    - Test fallback path on Windows
    - Verify no OpenGL imports occur
    - _Requirements: 2.1, 2.3_

  - [x] 6.3 Implement error recovery

    - Catch rendering exceptions and return skeleton-only
    - Log errors with context for debugging
    - Ensure system never crashes on mesh rendering failure
    - _Requirements: 2.4, 2.5_

  - [ ]* 6.4 Write property test for no OpenGL dependencies
    - **Feature: smpl-mesh-visualization, Property 6: No OpenGL Dependencies**
    - **Validates: Requirements 2.1**

  - [ ]* 6.5 Write property test for fallback to software rasterization
    - **Feature: smpl-mesh-visualization, Property 7: Fallback to Software Rasterization**
    - **Validates: Requirements 2.3**

  - [ ]* 6.6 Write property test for graceful error recovery
    - **Feature: smpl-mesh-visualization, Property 8: Graceful Error Recovery**
    - **Validates: Requirements 2.4, 2.5**

- [ ] 7. Integrate mesh rendering into pose detector
  - [x] 7.1 Add mesh rendering to detect_pose_with_visualization()


    - Extract mesh data from HMR2 output
    - Project mesh vertices to 2D
    - Sort faces by depth
    - Render mesh onto frame
    - Composite skeleton on top
    - Return base64-encoded PNG
    - _Requirements: 1.1, 1.2, 1.3, 6.1_

  - [x] 7.2 Add mesh data to pose detection result

    - Include mesh vertices in result dictionary
    - Include mesh faces in result dictionary
    - Include camera parameters in result dictionary
    - _Requirements: 1.1_

  - [x] 7.3 Implement performance monitoring

    - Measure mesh extraction time
    - Measure projection time
    - Measure rendering time
    - Log timing information
    - _Requirements: 3.1_

  - [ ]* 7.4 Write property test for performance budget
    - **Feature: smpl-mesh-visualization, Property 9: Performance Within Budget**
    - **Validates: Requirements 3.1**

  - [ ]* 7.5 Write property test for output format correctness
    - **Feature: smpl-mesh-visualization, Property 10: Output Format Correctness**
    - **Validates: Requirements 3.2**

  - [ ]* 7.6 Write property test for frame independence
    - **Feature: smpl-mesh-visualization, Property 11: Frame Independence**
    - **Validates: Requirements 3.3**

- [ ] 8. Implement skeleton overlay
  - [x] 8.1 Draw skeleton connections

    - Implement `draw_skeleton_connections(image, keypoints, connections)` function
    - Draw lines between connected joints
    - Use orange color (RGB: 255, 165, 0)
    - Handle missing or invalid keypoints
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Draw skeleton joints

    - Implement `draw_skeleton_joints(image, keypoints)` function
    - Draw circles at joint positions
    - Use orange color (RGB: 255, 165, 0)
    - Handle out-of-bounds joints
    - _Requirements: 6.1, 6.2_

  - [x] 8.3 Implement rendering order (mesh first, skeleton on top)

    - Render mesh to image
    - Draw skeleton connections on top
    - Draw skeleton joints on top
    - Verify mesh is underneath skeleton
    - _Requirements: 6.1_

  - [ ]* 8.4 Write property test for rendering order
    - **Feature: smpl-mesh-visualization, Property 16: Rendering Order Correctness**
    - **Validates: Requirements 6.1**

  - [ ]* 8.5 Write property test for skeleton color accuracy
    - **Feature: smpl-mesh-visualization, Property 17: Skeleton Color Accuracy**
    - **Validates: Requirements 6.2**

  - [ ]* 8.6 Write property test for mesh unavailability fallback
    - **Feature: smpl-mesh-visualization, Property 18: Mesh Unavailability Fallback**
    - **Validates: Requirements 6.3**

- [ ] 9. Implement alignment validation
  - [x] 9.1 Implement mesh-skeleton alignment check

    - Compute distance between mesh vertices and skeleton joints
    - Verify alignment within 5 pixel tolerance
    - Log alignment errors for debugging
    - _Requirements: 1.4_

  - [x] 9.2 Test back-facing pose handling

    - Verify mesh renders correctly for back-facing poses
    - Verify alignment with back-facing skeleton joints
    - Test with sample back-facing snowboarding frames
    - _Requirements: 1.5_

  - [ ]* 9.3 Write property test for mesh-skeleton alignment
    - **Feature: smpl-mesh-visualization, Property 4: Mesh-Skeleton Alignment**
    - **Validates: Requirements 1.4**

  - [ ]* 9.4 Write property test for back-facing pose handling
    - **Feature: smpl-mesh-visualization, Property 5: Back-Facing Pose Handling**
    - **Validates: Requirements 1.5**

- [x] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integration testing

  - [x] 11.1 Test end-to-end visualization on sample frames

    - Process sample snowboarding frames
    - Verify mesh overlay appears correctly
    - Verify skeleton overlay appears correctly
    - Verify base64 PNG output is valid
    - _Requirements: 1.1, 1.2, 1.3, 6.1_

  - [x] 11.2 Test error scenarios

    - Test with invalid HMR2 output
    - Test with missing mesh data
    - Test with invalid camera parameters
    - Verify graceful fallback to skeleton-only
    - _Requirements: 2.4, 2.5_

  - [x] 11.3 Test performance on various image sizes

    - Test on 480p, 720p, 1080p frames
    - Verify performance stays under 150ms
    - Log timing for different resolutions
    - _Requirements: 3.1_

  - [x] 11.4 Test Windows compatibility

    - Verify no OpenGL imports on Windows
    - Verify software rasterization works
    - Test on actual Windows machine if available
    - _Requirements: 2.1, 2.3_

- [x] 12. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Documentation and cleanup


  - [x] 13.1 Add docstrings to all functions

    - Document parameters and return types
    - Include usage examples
    - Document error conditions
    - _Requirements: All_


  - [ ] 13.2 Add inline comments for complex algorithms
    - Document projection formula
    - Document depth sorting algorithm
    - Document triangle rasterization
    - _Requirements: All_


  - [ ] 13.3 Update hybrid_pose_detector.py integration
    - Import mesh_renderer module
    - Call mesh rendering in detect_pose_with_visualization()
    - Handle mesh rendering errors gracefully
    - _Requirements: All_
