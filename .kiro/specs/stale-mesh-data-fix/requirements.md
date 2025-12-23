# Stale Mesh Data Fix - Requirements

## Introduction

When uploading a second rider video, the mesh overlay displayed the first video's mesh instead of the new video's mesh. This document specifies the requirements for fixing this stale data issue.

## Glossary

- **Mesh Data**: 3D skeleton keypoints and mesh vertices extracted from video frames
- **VideoId**: Unique identifier for each uploaded video (format: v_timestamp_counter)
- **Frame**: Individual video frame with associated mesh data
- **Stale Data**: Mesh data from a previous video that incorrectly appears when viewing a new video
- **Deletion Verification**: Process of confirming old data was removed before saving new data
- **Insertion Verification**: Process of confirming new data was successfully saved to database
- **Retrieval Verification**: Process of confirming retrieved data belongs to the correct video

## Requirements

### Requirement 1: Data Cleanup on Upload

**User Story:** As a user, I want each video upload to completely replace the previous video's mesh data, so that I don't see stale data from old uploads.

#### Acceptance Criteria

1. WHEN a new video is uploaded with a different videoId THEN the system SHALL delete all mesh frames associated with the previous videoId before saving new frames
2. WHEN frames are deleted THEN the system SHALL verify that zero frames remain for the old videoId before proceeding with new frame insertion
3. IF deletion verification fails THEN the system SHALL log an error and prevent the upload from completing
4. WHEN new frames are inserted THEN the system SHALL verify that all inserted frames are present in the database with correct videoId

### Requirement 2: Data Integrity Verification

**User Story:** As a developer, I want the system to verify data integrity at every step, so that I can trust the mesh data is correct.

#### Acceptance Criteria

1. WHEN mesh data is retrieved THEN the system SHALL verify that all frames have the correct videoId matching the request
2. IF any frame has an incorrect videoId THEN the system SHALL throw an error and log the mismatch
3. WHEN frames are retrieved THEN the system SHALL verify that keypoint data is not empty
4. WHEN data is saved THEN the system SHALL log the number of frames saved and verify the count matches expected

### Requirement 3: Mesh Display Updates

**User Story:** As a user, I want the mesh overlay to update immediately when I switch between videos, so that I see the correct rider's pose.

#### Acceptance Criteria

1. WHEN a new video is selected THEN the frontend SHALL fetch mesh data for that videoId
2. WHEN mesh data is fetched THEN the frontend SHALL display the mesh corresponding to the fetched videoId
3. WHEN switching between videos THEN the mesh overlay SHALL update to show the new video's mesh (not the previous video's mesh)
4. WHEN mesh data contains multiple frames THEN the frontend SHALL display the correct frame for the current playback position

### Requirement 4: Logging and Diagnostics

**User Story:** As a developer, I want comprehensive logging so that I can diagnose issues when stale data appears.

#### Acceptance Criteria

1. WHEN mesh data is saved THEN the system SHALL log: videoId, frame count, fps, and role
2. WHEN frames are deleted THEN the system SHALL log the number of deleted frames
3. WHEN deletion verification occurs THEN the system SHALL log the count of remaining frames
4. WHEN data is retrieved THEN the system SHALL log the videoId and number of frames retrieved
5. WHEN data integrity issues are detected THEN the system SHALL log detailed error information including expected vs actual videoId
