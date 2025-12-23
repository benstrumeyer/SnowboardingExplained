# Implementation Plan: Synchronized Video & Mesh Playback

- [x] 1. Set up shared mesh transposition library


  - Extract mesh transposition code from React Native implementation
  - Create shared library structure with TypeScript interfaces
  - Implement 2D-to-3D and 3D-to-2D transformation functions
  - Ensure both web and React Native can import and use the library
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3_

- [ ] 1.1 Write property test for mesh transposition equivalence
  - **Feature: synchronized-video-mesh-playback, Property 8: Mesh Transposition Equivalence**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 2. Implement backend frame data API
  - Create `/api/video/{videoId}/frame/{frameIndex}` endpoint
  - Implement frame data retrieval with optional fields (original, overlay, mesh)
  - Add response compression using gzip
  - Ensure frame data consistency (all data corresponds to same frameIndex)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.1 Write property test for frame data consistency
  - **Feature: synchronized-video-mesh-playback, Property 5: Frame Data Consistency**
  - **Validates: Requirements 2.1, 2.2, 7.1**

- [ ] 3. Implement Redis cache layer
  - Set up Redis connection and cache key structure
  - Implement frame caching with 1-hour TTL
  - Add cache preloading for next 10 frames on video load
  - Implement cache eviction (LRU) when full
  - Add cache hit/miss tracking
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.1 Write property test for Redis cache hit rate
  - **Feature: synchronized-video-mesh-playback, Property 7: Redis Cache Hit Rate**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 4. Implement 2D mesh overlay generation
  - Create overlay generation pipeline using shared mesh transposition library
  - Generate 2D mesh skeleton on video frames
  - Store overlay frames as JPEG in file storage
  - Integrate overlay generation with frame API
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4.1 Write property test for frame data consistency with overlays
  - **Feature: synchronized-video-mesh-playback, Property 5: Frame Data Consistency**
  - **Validates: Requirements 2.1, 2.2, 7.1**

- [ ] 5. Implement PlaybackSyncService (frontend)
  - Create service to manage synchronized playback across multiple scenes
  - Implement frame advancement logic that maintains independent frame positions
  - Implement playback speed control for all scenes
  - Implement pause/play functionality
  - Add frame change event subscriptions per scene
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 5.1 Write property test for independent frame position maintenance
  - **Feature: synchronized-video-mesh-playback, Property 1: Independent Frame Position Maintenance**
  - **Validates: Requirements 6.1, 6.3**

- [ ] 5.2 Write property test for playback speed consistency
  - **Feature: synchronized-video-mesh-playback, Property 2: Playback Speed Consistency**
  - **Validates: Requirements 6.2**

- [ ] 6. Implement frame seek functionality
  - Add seekByOffset method to advance all scenes by same frame offset
  - Ensure seek maintains independent frame positions
  - Implement atomic frame updates across all scenes
  - _Requirements: 6.5_

- [ ] 6.1 Write property test for frame seek offset consistency
  - **Feature: synchronized-video-mesh-playback, Property 3: Frame Seek Offset Consistency**
  - **Validates: Requirements 6.5**

- [ ] 7. Implement FrameDataService (frontend)
  - Create service to retrieve frame data from backend
  - Implement local caching layer
  - Add frame preloading for smooth playback
  - Implement cache clearing
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 7.1 Write property test for video-mesh frame correspondence
  - **Feature: synchronized-video-mesh-playback, Property 4: Video-Mesh Frame Correspondence**
  - **Validates: Requirements 6.6, 7.1**

- [ ] 8. Implement overlay toggle functionality
  - Add overlay toggle state per scene
  - Implement switching between original and overlay frames
  - Ensure toggle maintains current frame index
  - Allow toggling during active playback
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8.1 Write property test for overlay toggle idempotence
  - **Feature: synchronized-video-mesh-playback, Property 6: Overlay Toggle Idempotence**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 9. Integrate PlaybackSyncService with scene components
  - Connect PlaybackSyncService to all scene components
  - Implement frame change subscriptions in scene components
  - Update scene rendering on frame changes
  - Ensure video and mesh stay synchronized within each scene
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 10. Integrate FrameDataService with scene components
  - Connect FrameDataService to scene components
  - Implement frame data fetching on frame changes
  - Handle frame data updates in scene rendering
  - Implement error handling for frame retrieval failures
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 11.1 Write unit tests for PlaybackSyncService
  - Test frame advancement logic
  - Test playback speed calculations
  - Test pause/play functionality
  - Test frame change event emissions
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 11.2 Write unit tests for FrameDataService
  - Test frame data retrieval
  - Test local caching behavior
  - Test frame preloading
  - Test cache clearing
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 11.3 Write unit tests for frame API endpoint
  - Test frame data retrieval with different query parameters
  - Test response compression
  - Test error handling for missing frames
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 11.4 Write integration tests for multi-scene playback
  - Test synchronized playback across multiple scenes
  - Test independent frame position maintenance
  - Test overlay toggle during playback
  - Test frame seek operations
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 12. Test with MCP servers and verify builds
  - Run backend build and verify no compilation errors
  - Run frontend build and verify no compilation errors
  - Test backend API endpoints with MCP server tools
  - Test frontend components with MCP server tools
  - Verify no runtime errors in browser console
  - Verify no runtime errors in backend logs
  - _Requirements: All_

- [ ] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
