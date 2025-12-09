export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  metadata?: {
    query_time_ms: number;
    cache_hit: boolean;
    timestamp: string;
  };
}

export class ResponseFormatter {
  static success<T>(
    data: T,
    cached: boolean = false,
    queryTimeMs: number = 0
  ): MCPResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        query_time_ms: queryTimeMs,
        cache_hit: cached,
        timestamp: new Date().toISOString(),
      },
    };
  }

  static error(
    message: string,
    code: string = 'ERROR',
    queryTimeMs: number = 0
  ): MCPResponse {
    return {
      success: false,
      error: message,
      code,
      metadata: {
        query_time_ms: queryTimeMs,
        cache_hit: false,
        timestamp: new Date().toISOString(),
      },
    };
  }

  static validate(response: any): boolean {
    if (!response || typeof response !== 'object') return false;
    if (typeof response.success !== 'boolean') return false;
    if (response.success && !response.data) return false;
    if (!response.success && !response.error) return false;
    return true;
  }
}
