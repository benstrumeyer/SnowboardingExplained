# Implementation Plan: Frontend-Backend Integration

## Overview

Implement the mesh data adapter service and endpoints to bridge the backend's MongoDB-stored frame data with the frontend's MeshSequence expectations. This enables the existing frontend viewer to display processed videos with synchronized 3D mesh visualization.

## Tasks

- [ ] 1. Create mesh data adapter service
  - Create `backend/src/services/meshDataAdapter.ts`
  - Implement `getMeshSequence(videoId)` function
  - Implement frame transformation logic (PersonData → Keypoint)
  - Implement timestamp calculation
  - Implement SyncedFrame construction
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 1.1 Write property tests for mesh data adapter
  - **Property 1: Frame Ordering Invariant**
  - **Property 2: Frame Count Consistency**
  - **Property 3: Timestamp Monotonicity**
  - **Property 4: Mesh Data Completeness**
  - **Property 5: Video Metadata Presence**
  - _Requirements: 1.1, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Create mesh data endpoint
  - Create `backend/src/api/mesh-data.ts` router
  - Implement `GET /api/mesh-data/{videoId}` endpoint
  - Integrate with meshDataAdapter service
  - Handle 202 (processing) responses
  - Handle 404 (not found) responses
  - Handle 500 (error) responses
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4_

- [ ]* 2.1 Write unit tests for mesh data endpoint
  - Test successful mesh data retrieval
  - Test 202 processing response
  - Test 404 not found response
  - Test 500 error response
  - Test frame ordering
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 3. Create video streaming endpoints
  - Add `GET /api/mesh-data/{videoId}/video/original` endpoint
  - Add `GET /api/mesh-data/{videoId}/video/overlay` endpoint
  - Implement HTTP range request support
  - Set proper Content-Type and Content-Length headers
  - Handle file not found errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 3.1 Write property test for video streaming round-trip
  - **Property 6: Video Streaming Round-Trip**
  - Stream original video and verify content
  - Stream overlay video and verify content
  - _Requirements: 2.1, 2.2_

- [ ] 4. Register mesh data routes in server
  - Import meshDataRouter in `backend/src/server.ts`
  - Mount router at `/api/mesh-data`
  - Verify routes are accessible
  - _Requirements: 1.1, 2.1_

- [ ] 5. Checkpoint - Verify integration
  - Test mesh data endpoint with real video
  - Verify frame data structure matches frontend expectations
  - Verify video streaming works
  - Check logs for errors
  - _Requirements: 1.1, 1.5, 2.1, 2.2_

- [ ]* 5.1 Write integration tests
  - Test full flow: upload → process → retrieve mesh data
  - Test concurrent requests
  - Test error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Update frontend API URL (if needed)
  - Verify frontend is calling `/api/mesh-data/{videoId}`
  - Update VITE_API_URL if necessary
  - Test frontend mesh loading
  - _Requirements: 1.1, 1.5_

- [ ] 7. Final checkpoint - End-to-end test
  - Upload video via frontend
  - Verify backend processes video
  - Verify mesh data endpoint returns correct structure
  - Verify frontend displays video + mesh in side-by-side view
  - Verify video and mesh are synchronized
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 2.1, 2.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Focus on core functionality first (tasks 1-4)
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows

