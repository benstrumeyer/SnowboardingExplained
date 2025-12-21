/**
 * Error Types
 * Task 17: Error handling for form analysis system
 */

export interface ProcessingError {
  stage: string;
  error: string;
  partialData?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface MCPToolError {
  code: string;
  message: string;
  availableOptions?: any;
  suggestion?: string;
}

export enum ErrorCode {
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  FRAME_NOT_FOUND = 'FRAME_NOT_FOUND',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  POSE_EXTRACTION_FAILED = 'POSE_EXTRACTION_FAILED',
  PHASE_DETECTION_FAILED = 'PHASE_DETECTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class FormAnalysisError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FormAnalysisError';
  }
}

export function createMCPToolError(
  code: string,
  message: string,
  availableOptions?: any
): MCPToolError {
  return {
    code,
    message,
    availableOptions,
    suggestion: getSuggestion(code),
  };
}

function getSuggestion(code: string): string {
  switch (code) {
    case ErrorCode.VIDEO_NOT_FOUND:
      return 'Use list_available_videos to see available videos';
    case ErrorCode.FRAME_NOT_FOUND:
      return 'Check the frame number is within the video duration';
    case ErrorCode.INVALID_PARAMETER:
      return 'Check the parameter types and values';
    case ErrorCode.POSE_EXTRACTION_FAILED:
      return 'Try uploading a clearer video with better lighting';
    case ErrorCode.PHASE_DETECTION_FAILED:
      return 'Ensure the video contains a complete trick';
    default:
      return 'Contact support if the error persists';
  }
}
