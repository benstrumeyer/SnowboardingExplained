# Implementation Plan - Stale Mesh Data Fix

## Overview
This implementation plan converts the design into actionable coding tasks. Each task builds incrementally on previous tasks, with property-based tests integrated throughout to verify correctness properties.

---

## Phase 1: Backend Data Service Implementation

- [x] 1. Set up MongoDB connection with authentication

  - Ensure MongoDB Docker container is running with auth enabled
  - Test connection string: `mongodb://admin:password@localhost:27017/meshes?authSource=admin`
  - Verify collections exist: `mesh_data` and `mesh_frames`
  - _Requirements: 1.1, 2.1_



- [ ] 2. Implement MeshDataService with three-layer verification
  - Create `meshDataService.ts` with connection management
  - Implement `connect()` method with error handling
  - Implement `saveMeshData(meshData)` with Layer 1 (deletion verification)
  - Implement Layer 2 (insertion verification) - verify all frames inserted
  - Implement Layer 3 (retrieval verification) - verify videoId integrity
  - Add comprehensive logging at each verification layer
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 4.3_

- [ ]* 2.1 Write property test for old data deletion
  - **Feature: stale-mesh-data-fix, Property 1: Old Data Deletion**
  - Generate random videoIds and frame data
  - Verify that uploading with new videoId deletes old frames
  - Minimum 100 iterations
  - _Requirements: 1.1, 1.2_

- [ ]* 2.2 Write property test for deletion verification
  - **Feature: stale-mesh-data-fix, Property 2: Deletion Verification**
  - Generate random frame counts
  - Verify zero frames remain after deletion before insertion
  - Minimum 100 iterations
  - _Requirements: 1.2_

- [ ]* 2.3 Write property test for insertion verification
  - **Feature: stale-mesh-data-fix, Property 3: Insertion Verification**
  - Generate random frames with correct videoId
  - Verify all inserted frames are present in database
  - Minimum 100 iterations
  - _Requirements: 1.3, 1.4_

- [ ] 3. Implement getMeshData with retrieval verification
  - Implement `getMeshData(videoId)` method
  - Add Layer 3 verification: check all frames have correct videoId
  - Throw error if videoId mismatch detected
  - Add comprehensive logging for retrieval operations
  - _Requirements: 2.1, 2.2, 2.3, 4.4, 4.5_

- [ ]* 3.1 Write property test for videoId integrity on retrieval
  - **Feature: stale-mesh-data-fix, Property 4: VideoId Integrity on Retrieval**
  - Generate random queries with different videoIds
  - Verify all returned frames have correct videoId
  - Minimum 100 iterations
  - _Requirements: 2.1, 2.2_

- [ ]* 3.2 Write property test for keypoint data presence
  - **Feature: stale-mesh-data-fix, Property 5: Keypoint Data Presence**
  - Generate random frames with keypoint data
  - Verify keypoints array is not empty for all retrieved frames
  - Minimum 100 iterations
  - _Requirements: 2.3_

- [ ] 4. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Upload Endpoint Integration

- [ ] 5. Update upload endpoint with mesh data service
  - Modify `/api/upload-video-with-pose` endpoint
  - Call `meshDataService.saveMeshData()` with verification
  - Handle deletion verification failures (prevent upload)
  - Handle insertion verification failures (log warning)
  - Return videoId and frame count to frontend
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3_

- [ ]* 5.1 Write unit test for upload endpoint
  - Test successful upload with frame verification
  - Test upload with deletion verification
  - Test error handling for verification failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Frontend Mesh Display Updates

- [ ] 7. Update PoseOverlayViewer to fetch mesh for current video
  - Modify `PoseOverlayViewer.tsx` to fetch mesh data when videoId changes
  - Call backend `getMeshData(videoId)` endpoint
  - Handle retrieval verification errors gracefully
  - _Requirements: 3.1, 3.2_

- [ ] 8. Implement mesh display update on video switch
  - Update mesh overlay when videoId changes
  - Ensure mesh corresponds to newly selected videoId (not previous)
  - Clear previous mesh data before loading new mesh
  - _Requirements: 3.3_

- [ ] 9. Implement frame-accurate mesh display
  - Display correct frame for current playback position
  - Sync mesh frame with video playback frame
  - Handle frame seeking and playback position changes
  - _Requirements: 3.4_

- [ ]* 9.1 Write property test for mesh display consistency
  - **Feature: stale-mesh-data-fix, Property 6: Mesh Display Consistency**
  - Generate random video switches
  - Verify displayed mesh corresponds to newly selected videoId
  - Verify mesh is not from previous videoId
  - Minimum 100 iterations
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Logging and Diagnostics

- [ ] 11. Implement comprehensive logging throughout data flow
  - Log videoId, frame count, fps, role on save (Requirement 4.1)
  - Log number of deleted frames (Requirement 4.2)
  - Log remaining frame count after deletion (Requirement 4.3)
  - Log videoId and frame count on retrieval (Requirement 4.4)
  - Log detailed error info on integrity issues (Requirement 4.5)
  - Use color-coded console logs for visibility
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 11.1 Write property test for frame count accuracy
  - **Feature: stale-mesh-data-fix, Property 7: Frame Count Accuracy**
  - Generate random frame counts
  - Verify saved frame count equals input frame count
  - Verify logged count matches actual count
  - Minimum 100 iterations
  - _Requirements: 1.4, 4.4_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: End-to-End Testing

- [ ]* 13. Write integration test for complete stale data fix
  - Upload first video with mesh data
  - Verify mesh displays correctly
  - Upload second video with different mesh data
  - Verify old mesh data is deleted
  - Verify new mesh displays (not stale data)
  - Verify all verification layers passed
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

- [ ] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- All property-based tests use fast-check library with minimum 100 iterations
- Each property test is tagged with feature name, property number, and requirement reference
- Optional tasks (marked with *) focus on testing and can be skipped for MVP
- Core implementation tasks (unmarked) are required for functionality
- MongoDB connection uses Docker container on localhost:27017
- All logging uses color-coded console output for visibility
