# Requirements: Frontend-Backend Integration

## Introduction

The frontend is already built with a comprehensive side-by-side viewer (video + Three.js mesh) and expects mesh data from `/api/mesh-data/{videoId}`. The backend has implemented direct video processing with MongoDB storage. This spec bridges the gap by creating an adapter endpoint that transforms stored frame data into the frontend's expected `MeshSequence` format.

## Glossary

- **MeshSequence**: Unified data structure containing video metadata and synchronized frame data
- **SyncedFrame**: Individual frame with mesh data (vertices, faces, camera params, keypoints)
- **VideoId**: Unique identifier for processed video
- **Frame**: Individual frame from video with pose/mesh data stored in MongoDB

## Requirements

### Requirement 1: Mesh Data Retrieval Endpoint

**User Story:** As a frontend developer, I want to fetch mesh data for a video, so that I can display the 3D pose visualization synchronized with video playback.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/mesh-data/{videoId}`, THE system SHALL return a MeshSequence object with all frames
2. WHEN frames are not yet available, THE system SHALL return HTTP 202 (Accepted) with processing status
3. WHEN a videoId does not exist, THE system SHALL return HTTP 404 (Not Found)
4. WHEN frames are retrieved, THE system SHALL include video metadata (fps, duration, resolution, frameCount)
5. WHEN frames are retrieved, THE system SHALL include all frame data (vertices, faces, camera params, keypoints)
6. WHEN frames are retrieved, THE system SHALL order frames sequentially by frameNumber

### Requirement 2: Video Streaming Endpoints

**User Story:** As a frontend developer, I want to stream original and overlay videos, so that I can display them in the side-by-side viewer.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/mesh-data/{videoId}/video/original`, THE system SHALL stream the original uploaded video
2. WHEN a GET request is made to `/api/mesh-data/{videoId}/video/overlay`, THE system SHALL stream the PHALP mesh overlay video
3. WHEN streaming videos, THE system SHALL support HTTP range requests for seeking
4. WHEN streaming videos, THE system SHALL set proper Content-Type and Content-Length headers

### Requirement 3: Data Transformation

**User Story:** As a backend developer, I want to transform MongoDB frame data into MeshSequence format, so that the frontend receives correctly structured data.

#### Acceptance Criteria

1. WHEN frames are retrieved from MongoDB, THE system SHALL transform PersonData into Keypoint objects
2. WHEN frames are retrieved, THE system SHALL include mesh vertices and faces from stored data
3. WHEN frames are retrieved, THE system SHALL include camera parameters (tx, ty, tz, focal_length)
4. WHEN frames are retrieved, THE system SHALL calculate timestamps based on frame number and fps
5. WHEN frames are retrieved, THE system SHALL include video metadata from videos collection

### Requirement 4: Error Handling

**User Story:** As a frontend developer, I want clear error messages, so that I can debug issues with mesh data loading.

#### Acceptance Criteria

1. WHEN MongoDB connection fails, THE system SHALL return HTTP 500 with error message
2. WHEN frames collection is empty, THE system SHALL return HTTP 404 with "No frames found" message
3. WHEN video metadata is missing, THE system SHALL return HTTP 404 with "Video metadata not found" message
4. WHEN data transformation fails, THE system SHALL log error and return HTTP 500 with descriptive message

