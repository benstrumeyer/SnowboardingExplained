export class MCPError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends MCPError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends MCPError {
  constructor(message: string) {
    super('DATABASE_ERROR', message, 500);
    this.name = 'DatabaseError';
  }
}

export class TimeoutError extends MCPError {
  constructor(message: string) {
    super('TIMEOUT', message, 504);
    this.name = 'TimeoutError';
  }
}

export function formatErrorResponse(error: any): Record<string, any> {
  if (error instanceof MCPError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}
