# Implementation Plan: Direct Video Processing

## Overview

Implement a two-stage video processing workflow where users manually run track.py in WSL terminal, then click "Process" button in web UI to parse pkl files and store to MongoDB.

## Tasks

- [ ] 1. Create Pickle Parser Service
- [ ] 1.1 Implement pickleParserService.ts to load and parse .pkl files
  - Load pickle file from `/tmp/video_processing/results.pkl`
  - Extract frame data (frame number, timestamp, persons)
  - Extract SMPL parameters (betas, body_pose, global_orient)
  - Extract keypoints (3D and 2D)
  - Extract camera parameters (tx, ty, tz, focal_length)
  - Extract bounding boxes and confidence scores
  - Convert numpy arrays to JavaScript arrays
  - Return FrameData[] array
  - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [ ]* 1.2 Write property test for frame coverage
  - **Property 1: Frame Coverage**
  - **Validates: Requirements 1.4, 3.1**

- [ ]* 1.3 Write property test for keypoint count
  - **Property 5: Keypoint Count**
  - **Validates: Requirements 2.3, 3.3**

- [ ] 2. Create Video Metadata Service
- [ ] 2.1 Implement videoMetadataService.ts to extract video metadata
  - Read original video file from `/tmp/video_processing/video.mp4`
  - Extract fps, duration, resolution, frame count
  - Return VideoMetadata object
  - _Requirements: 2.7_

- [ ]* 2.2 Write unit tests for metadata extraction
  - Test fps extraction
  - Test duration extraction
  - Test resolution extraction
  - Test frame count extraction
  - _Requirements: 2.7_

- [ ] 3. Create Frame Storage Service
- [ ] 3.1 Implement frameStorageService.ts for MongoDB operations
  - Create frames collection if not exists
  - Implement storeFrames() to batch insert frame documents
  - Create indexes: {videoId: 1, frameNumber: 1}, {videoId: 1}, {createdAt: 1} with TTL
  - Implement getFrame() to query single frame
  - Implement getAllFrames() to query all frames for video
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 3.2 Write property test for MongoDB round-trip
  - **Property 7: MongoDB Round-Trip**
  - **Validates: Requirements 4.4, 4.5**

- [ ]* 3.3 Write unit tests for MongoDB operations
  - Test frame document creation
  - Test index creation
  - Test query by video_id + frame_number
  - Test query all frames for video
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. Create Process Directory Endpoint
- [ ] 4.1 Implement /api/video/process-directory endpoint
  - Validate `/tmp/video_processing/` directory exists
  - Search for .pkl file in directory
  - Search for original video file (video.mp4)
  - If either missing, return HTTP 400 with error
  - Call pickleParserService to parse pkl
  - Call videoMetadataService to extract metadata
  - Call frameStorageService to store frames
  - Generate video_id and return success response
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ]* 4.2 Write unit tests for endpoint
  - Test directory validation
  - Test .pkl file detection
  - Test video file detection
  - Test error responses
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 5. Create Frontend Process Button
- [ ] 5.1 Add "Process" button to web UI
  - Create button component that calls POST /api/video/process-directory
  - Display loading state while processing
  - Display success message with video_id on completion
  - Display error message on failure
  - _Requirements: 1.1_

- [ ]* 5.2 Write unit tests for Process button
  - Test button click triggers API call
  - Test loading state display
  - Test success message display
  - Test error message display
  - _Requirements: 1.1_

- [ ] 6. Create Frame Query Endpoints
- [ ] 6.1 Implement GET /api/frames/:videoId endpoint
  - Query all frames for video_id from MongoDB
  - Return frames array with mesh data
  - _Requirements: 4.4, 4.5_

- [ ] 6.2 Implement GET /api/frames/:videoId/:frameNumber endpoint
  - Query single frame by video_id and frame_number
  - Return frame with mesh data
  - _Requirements: 4.4, 4.5_

- [ ]* 6.3 Write unit tests for frame query endpoints
  - Test query all frames
  - Test query single frame
  - Test 404 on missing frame
  - _Requirements: 4.4, 4.5_

- [ ] 7. Implement Error Handling
- [ ] 7.1 Add error handling for directory access
  - Catch directory not found errors
  - Catch file not found errors
  - Return appropriate HTTP status codes
  - Log errors for debugging
  - _Requirements: 8.1, 8.2, 8.3, 8.6_

- [ ] 7.2 Add error handling for parsing
  - Catch pickle parse errors
  - Catch invalid frame data errors
  - Return HTTP 500 with error details
  - Log errors for debugging
  - _Requirements: 8.3, 8.6_

- [ ] 7.3 Add error handling for MongoDB
  - Catch connection errors
  - Catch insert errors
  - Catch index creation errors
  - Return HTTP 500 with error details
  - Log errors for debugging
  - _Requirements: 8.5, 8.6_

- [ ]* 7.4 Write unit tests for error handling
  - Test missing directory handling
  - Test missing .pkl handling
  - Test missing video handling
  - Test corrupted pickle handling
  - Test MongoDB connection failure handling
  - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

- [ ] 8. Implement Correctness Properties
- [ ] 8.1 Write property test for track ID consistency
  - **Property 2: Track ID Consistency**
  - **Validates: Requirements 3.4, 6.3**

- [ ] 8.2 Write property test for mesh vertex count
  - **Property 3: Mesh Vertex Count**
  - **Validates: Requirements 2.6, 3.3**

- [ ] 8.3 Write property test for mesh face count
  - **Property 4: Mesh Face Count**
  - **Validates: Requirements 2.6, 3.3**

- [ ] 8.4 Write property test for confidence range
  - **Property 6: Confidence Range**
  - **Validates: Requirements 2.4, 2.5**

- [ ] 9. Checkpoint - Ensure all tests pass
- Ensure all unit tests and property tests pass
- Verify no TypeScript compilation errors
- Check backend logs for any warnings
- Ask the user if questions arise

- [ ] 10. Integration Testing
- [ ] 10.1 Test end-to-end workflow
  - Place video in `/tmp/video_processing/`
  - Run track.py manually to generate pkl
  - Click "Process" button in web UI
  - Verify frames stored in MongoDB
  - Query frames via API
  - Verify frame data structure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 10.2 Write integration tests
  - Test full workflow from directory to MongoDB
  - Test frame retrieval and rendering
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 11. Final Checkpoint - Ensure all tests pass
- Ensure all unit tests, property tests, and integration tests pass
- Verify no TypeScript compilation errors
- Check backend logs for any warnings
- Verify MongoDB data structure
- Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code should be written in TypeScript
- Use async/await for all I/O operations
- Log all errors with descriptive messages
