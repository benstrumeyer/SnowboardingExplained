/**
 * Frame Data Service (Frontend)
 * Retrieves frame data from backend with local caching
 * Ensures video-mesh frame correspondence
 */

export interface FrameData {
  videoId: string;
  frameIndex: number;
  timestamp: number;
  originalFrame?: string; // base64 JPEG
  overlayFrame?: string; // base64 JPEG with mesh
  meshData?: {
    keypoints: any[];
    skeleton: any;
  };
}

export interface FrameDataServiceConfig {
  apiBaseUrl?: string;
  cacheSize?: number; // number of frames to cache
  preloadCount?: number; // number of frames to preload
}

export class FrameDataService {
  private apiBaseUrl: string;
  private localCache: Map<string, FrameData> = new Map();
  private cacheSize: number;
  private preloadCount: number;
  private cacheOrder: string[] = []; // LRU tracking

  constructor(config: FrameDataServiceConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || 'http://localhost:3001';
    this.cacheSize = config.cacheSize || 100;
    this.preloadCount = config.preloadCount || 10;
  }

  /**
   * Get frame data from backend or local cache
   * Ensures video frame corresponds to mesh frame at same frameIndex
   */
  async getFrame(
    videoId: string,
    frameIndex: number,
    options: {
      includeOriginal?: boolean;
      includeOverlay?: boolean;
      includeMesh?: boolean;
    } = {}
  ): Promise<FrameData> {
    const {
      includeOriginal = true,
      includeOverlay = true,
      includeMesh = true
    } = options;

    const cacheKey = this.getCacheKey(videoId, frameIndex);

    // Check local cache first
    if (this.localCache.has(cacheKey)) {
      const cached = this.localCache.get(cacheKey)!;
      this.updateLRU(cacheKey);
      return this.filterFrameData(cached, { includeOriginal, includeOverlay, includeMesh });
    }

    // Fetch from backend
    try {
      const frameData = await this.fetchFrameFromBackend(
        videoId,
        frameIndex,
        { includeOriginal, includeOverlay, includeMesh }
      );

      // Cache locally
      this.cacheFrame(cacheKey, frameData);

      return frameData;
    } catch (error) {
      console.error(`Error fetching frame ${videoId}/${frameIndex}:`, error);
      throw error;
    }
  }

  /**
   * Preload next N frames
   */
  async preloadFrames(videoId: string, startFrame: number, count: number = this.preloadCount): Promise<void> {
    try {
      const preloadPromises = [];

      for (let i = 0; i < count; i++) {
        const frameIndex = startFrame + i;
        preloadPromises.push(
          this.getFrame(videoId, frameIndex).catch(err => {
            console.warn(`Failed to preload frame ${frameIndex}:`, err);
          })
        );
      }

      await Promise.all(preloadPromises);
      console.info(`Preloaded ${count} frames for ${videoId}`);
    } catch (error) {
      console.error(`Error preloading frames:`, error);
    }
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.localCache.clear();
    this.cacheOrder = [];
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedFrames: this.localCache.size,
      maxSize: this.cacheSize
    };
  }

  /**
   * Fetch frame data from backend
   */
  private async fetchFrameFromBackend(
    videoId: string,
    frameIndex: number,
    options: {
      includeOriginal?: boolean;
      includeOverlay?: boolean;
      includeMesh?: boolean;
    }
  ): Promise<FrameData> {
    const params = new URLSearchParams();
    params.append('includeOriginal', String(options.includeOriginal ?? true));
    params.append('includeOverlay', String(options.includeOverlay ?? true));
    params.append('includeMesh', String(options.includeMesh ?? true));
    params.append('compress', 'true');

    const url = `${this.apiBaseUrl}/api/video/${videoId}/frame/${frameIndex}?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch frame: ${response.statusText}`);
    }

    // Handle gzip decompression if needed
    let data: FrameData;
    const contentEncoding = response.headers.get('content-encoding');

    if (contentEncoding === 'gzip') {
      const buffer = await response.arrayBuffer();
      const decompressed = await this.decompressGzip(buffer);
      data = JSON.parse(new TextDecoder().decode(decompressed));
    } else {
      data = await response.json();
    }

    // Validate frame correspondence
    if (data.frameIndex !== frameIndex) {
      throw new Error(`Frame index mismatch: expected ${frameIndex}, got ${data.frameIndex}`);
    }

    return data;
  }

  /**
   * Decompress gzip data
   */
  private async decompressGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      }
    });

    const decompressedStream = stream.pipeThrough(
      new (window as any).DecompressionStream('gzip')
    );

    const reader = decompressedStream.getReader();
    const chunks: Uint8Array[] = [];

    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value as Uint8Array);
      result = await reader.read();
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const decompressed = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    return decompressed.buffer;
  }

  /**
   * Cache frame data with LRU eviction
   */
  private cacheFrame(cacheKey: string, frameData: FrameData): void {
    // Remove if already exists
    if (this.localCache.has(cacheKey)) {
      this.cacheOrder = this.cacheOrder.filter(key => key !== cacheKey);
    }

    // Add to cache
    this.localCache.set(cacheKey, frameData);
    this.cacheOrder.push(cacheKey);

    // Evict LRU if cache is full
    if (this.localCache.size > this.cacheSize) {
      const lruKey = this.cacheOrder.shift();
      if (lruKey) {
        this.localCache.delete(lruKey);
      }
    }
  }

  /**
   * Update LRU order
   */
  private updateLRU(cacheKey: string): void {
    this.cacheOrder = this.cacheOrder.filter(key => key !== cacheKey);
    this.cacheOrder.push(cacheKey);
  }

  /**
   * Filter frame data based on requested fields
   */
  private filterFrameData(
    frameData: FrameData,
    options: {
      includeOriginal?: boolean;
      includeOverlay?: boolean;
      includeMesh?: boolean;
    }
  ): FrameData {
    const filtered: FrameData = {
      videoId: frameData.videoId,
      frameIndex: frameData.frameIndex,
      timestamp: frameData.timestamp
    };

    if (options.includeOriginal && frameData.originalFrame) {
      filtered.originalFrame = frameData.originalFrame;
    }

    if (options.includeOverlay && frameData.overlayFrame) {
      filtered.overlayFrame = frameData.overlayFrame;
    }

    if (options.includeMesh && frameData.meshData) {
      filtered.meshData = frameData.meshData;
    }

    return filtered;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(videoId: string, frameIndex: number): string {
    return `${videoId}:${frameIndex}`;
  }
}

// Singleton instance
let instance: FrameDataService | null = null;

export function initializeFrameDataService(config?: FrameDataServiceConfig): FrameDataService {
  instance = new FrameDataService(config);
  return instance;
}

export function getFrameDataService(): FrameDataService {
  if (!instance) {
    instance = new FrameDataService();
  }
  return instance;
}
