# Large Video Upload Debug Requirements

## Problem Statement

User attempted to upload a 60 FPS, 4-second video (~240 frames) and the upload failed silently. The file size limits have been increased to 2GB, but the upload still doesn't work.

## Root Cause Analysis

The current implementation has several issues:

1. **Fire-and-Forget Pattern**: Frontend sends upload and immediately closes dialog without waiting for response
2. **Silent Failures**: Backend errors are not communicated back to frontend
3. **No Error Feedback**: User has no way to know if upload succeeded or failed
4. **Timeout Issues**: Pose detection service might timeout on large videos
5. **No Progress Tracking**: User can't see if processing is happening

## Requirements

### Requirement 1: Proper Error Handling

**User Story**: As a user, I want to see if my video upload succeeded or failed, so I can take corrective action.

#### Acceptance Criteria

1. WHEN upload fails, THE system SHALL return a clear error message to the frontend
2. WHEN backend encounters an error, THE system SHALL log it with full stack trace
3. WHEN frontend receives an error, THE system SHALL display it to the user
4. WHEN user sees an error, THE system SHALL suggest corrective actions (e.g., "file too large", "unsupported format")
5. WHERE errors occur, THE system SHALL NOT silently fail

### Requirement 2: Proper Async Handling

**User Story**: As a user, I want the upload to complete before the dialog closes, so I know the upload succeeded.

#### Acceptance Criteria

1. WHEN user clicks "Upload", THE system SHALL wait for the upload to complete
2. WHEN upload completes successfully, THE system SHALL show a success message
3. WHEN upload fails, THE system SHALL show an error message and keep the dialog open
4. WHEN user clicks "Cancel", THE system SHALL abort the upload
5. WHERE upload is in progress, THE system SHALL disable the Cancel button

### Requirement 3: Timeout Configuration

**User Story**: As a developer, I want to configure timeouts for different stages of upload, so that large videos don't timeout prematurely.

#### Acceptance Criteria

1. WHEN uploading a large video, THE system SHALL have a long timeout (e.g., 10+ minutes)
2. WHEN pose detection is running, THE system SHALL have a separate timeout per frame
3. WHEN a timeout occurs, THE system SHALL log which stage timed out
4. WHEN timeout is exceeded, THE system SHALL return a clear error message
5. WHERE timeouts are configured, THE system SHALL be adjustable via environment variables

### Requirement 4: Progress Tracking

**User Story**: As a user, I want to see progress during upload and processing, so I know the system is working.

#### Acceptance Criteria

1. WHEN upload is in progress, THE system SHALL show upload progress (0-100%)
2. WHEN processing starts, THE system SHALL show processing progress (frame X of Y)
3. WHEN processing completes, THE system SHALL show a success message
4. WHERE progress is shown, THE system SHALL update in real-time
5. WHEN user closes the dialog, THE system SHALL continue processing in background

### Requirement 5: Debugging Endpoints

**User Story**: As a developer, I want to check upload status and debug issues, so I can troubleshoot problems.

#### Acceptance Criteria

1. WHEN I call `/api/upload-status/:videoId`, THE system SHALL return current processing status
2. WHEN I call `/api/upload-logs/:videoId`, THE system SHALL return all logs for that upload
3. WHEN I call `/api/upload-health`, THE system SHALL return health status of upload service
4. WHERE debugging endpoints are called, THE system SHALL require authentication (optional for dev)
5. WHEN debugging is enabled, THE system SHALL log detailed information about each stage

### Requirement 6: Graceful Degradation

**User Story**: As a system, I want to handle large videos gracefully, so that processing doesn't crash.

#### Acceptance Criteria

1. WHEN processing a large video, THE system SHALL process frames in batches
2. WHEN a frame fails to process, THE system SHALL skip it and continue
3. WHEN memory usage is high, THE system SHALL reduce batch size
4. WHEN processing takes too long, THE system SHALL allow user to cancel
5. WHERE processing is degraded, THE system SHALL log warnings

## Testing Strategy

### Unit Tests
- Error message formatting
- Timeout configuration
- Progress calculation

### Integration Tests
- Upload with various file sizes (10MB, 100MB, 500MB, 1GB)
- Upload with various video formats (MP4, MOV, WebM)
- Upload with network interruption (simulate timeout)
- Upload with pose detection failure
- Upload with database failure

### Acceptance Tests
- User can upload 60 FPS, 4-second video successfully
- User sees progress during upload
- User sees error message if upload fails
- User can cancel upload in progress
- Processing continues in background after dialog closes

## Success Criteria

1. User can upload a 60 FPS, 4-second video without errors
2. User sees clear feedback (success or error)
3. Processing completes within reasonable time (< 5 minutes for 4-second video)
4. No silent failures
5. Proper error messages guide user to fix issues
