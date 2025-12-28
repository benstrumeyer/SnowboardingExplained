# Implementation Plan: Cross-Platform Video Upload

## Overview

Implement an HTTP endpoint that accepts video file uploads from Windows (outside WSL). The endpoint will receive video files in various formats, validate them, store them, and trigger pose detection processing.

## Tasks

- [ ] 1. Add CORS middleware configuration to backend server
  - Enable CORS headers for cross-origin requests
  - Allow POST requests from Windows clients
  - _Requirements: Enable cross-origin requests_

- [ ] 2. Create direct video upload endpoint (`POST /api/upload-video-direct`)
  - Accept multipart form data with video file
  - Validate video format (MP4, MOV, AVI, WebM)
  - Store video in appropriate directory
  - Return video ID and metadata
  - _Requirements: Accept video uploads, support multiple formats_

- [ ] 3. Add video format validation utility
  - Check file MIME type
  - Validate file extension
  - Return clear error messages for unsupported formats
  - _Requirements: Support multiple video formats_

- [ ] 4. Integrate with existing video processing pipeline
  - Trigger frame extraction after upload
  - Trigger pose detection processing
  - Return processing status to client
  - _Requirements: Validate and process uploaded videos_

- [ ] 5. Test endpoint with curl/Postman from Windows
  - Test MP4 upload
  - Test MOV upload
  - Test unsupported format rejection
  - Verify CORS headers in response
  - _Requirements: All acceptance criteria_

