import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../logger';
import { MeshSequence, SyncedFrame } from '../types';
import { kalmanSmoothingService } from './kalmanSmoothingService';
import FrameQualityAnalyzer from './frameQualityAnalyzer';
import FrameFilterService from './frameFilterService';
import FrameIndexMapper from './frameIndexMapper';
import frameQualityConfig from '../config/frameQualityConfig';
import { FrameInterpolationService } from './frameInterpolation/frameInterpolationService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

// Database frame interface - represents actual stored frame structure
interface DatabaseFrame {
  videoId: string;
  frameNumber: number;
  timestamp: number;
  keypoints: any[];
  skeleton: any;
  has3d: boolean;
  jointAngles3d: any;
  mesh_vertices_data: number[][];
  mesh_faces_data: number[][];
  cameraTranslation: any;
  interpolated: boolean;
  createdAt: Date;
}

// Legacy interface for backward compatibility
interface MeshFrame {
  frameNumber: number;
  timestamp: number;
  keypoints: any[];
  skeleton: any;
}

// Updated interface for unified video + mesh storage
interface MeshData {
  _id?: string;
  videoId: string;
  videoUrl: string;
  role?: 'rider' | 'coach';
  fps: number;
  videoDuration: number;
  frameCount: number;
  totalFrames: number;
  frames: DatabaseFrame[] | SyncedFrame[]; // Support both database frames and synced frames
  metadata?: {
    uploadedAt: Date;
    processingTime: number;
    extractionMethod: string;
    frameIndexMapping?: any; // SerializedFrameIndexMapping
    qualityStats?: {
      originalCount: number;
      processedCount: number;
      removedCount: number;
      interpolatedCount: number;
      removalPercentage: string;
      interpolationPercentage: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

class MeshDataService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<MeshData> | null = null;
  private framesCollection: Collection<any> | null = null;
  private mongoUrl: string;
  private smoothingEnabled: boolean = true;
  private interpolationService: FrameInterpolationService = new FrameInterpolationService();
  private interpolationEnabled: boolean = true;
  private sourceFramesCache: Map<string, Map<number, any>> = new Map(); // videoId -> frameIndex -> frame

  constructor() {
    this.mongoUrl = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';
  }

  async connect(): Promise<void> {
    try {
      if (this.client) {
        return; // Already connected
      }

      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();
      
      // Extract database name from connection string or use default
      let dbName = 'snowboarding';
      try {
        const url = new URL(this.mongoUrl);
        const pathParts = url.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          dbName = pathParts[0];
          console.log(`[MESH-SERVICE] Using database from connection string: ${dbName}`);
        }
      } catch (err) {
        console.log(`[MESH-SERVICE] Could not parse database name from URL, using default: ${dbName}`);
      }
      
      this.db = this.client.db(dbName);
      this.collection = this.db.collection<MeshData>('mesh_data');
      this.framesCollection = this.db.collection('mesh_frames');

      // Create indexes for metadata collection
      try {
        await this.collection.createIndex({ videoId: 1 }, { unique: true });
      } catch (err: any) {
        if (err.codeName !== 'IndexKeySpecsConflict') {
          throw err;
        }
      }

      try {
        await this.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 }); // 30 day TTL
      } catch (err: any) {
        if (err.codeName !== 'IndexKeySpecsConflict') {
          throw err;
        }
      }

      // Create indexes for frames collection
      try {
        await this.framesCollection.createIndex({ videoId: 1, frameNumber: 1 }, { unique: true });
      } catch (err: any) {
        if (err.codeName !== 'IndexKeySpecsConflict') {
          throw err;
        }
      }

      try {
        await this.framesCollection.createIndex({ videoId: 1 });
      } catch (err: any) {
        if (err.codeName !== 'IndexKeySpecsConflict') {
          throw err;
        }
      }

      logger.info('Connected to MongoDB for mesh data storage');
    } catch (err) {
      logger.error('Failed to connect to MongoDB', { error: err });
      throw err;
    }
  }

  /**
   * Apply frame quality filtering to frames
   * 
   * DISABLED: Frame quality filtering is now handled by PHALP
   * This method is kept for backward compatibility but does nothing
   */
  private async applyFrameQualityFiltering(
    videoId: string,
    frames: any[],
    videoDimensions: { width: number; height: number }
  ): Promise<{
    filteredFrames: any[];
    frameIndexMapping: any;
    qualityStats: any;
  }> {
    // Return frames as-is without any filtering
    return {
      filteredFrames: frames,
      frameIndexMapping: undefined,
      qualityStats: undefined
    };
  }

  async saveMeshData(meshData: Omit<MeshData, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      console.log(`%c[MESH-SERVICE] ========== SAVE MESH DATA START ==========`, 'color: #FF6B6B; font-weight: bold; font-size: 14px;');
      console.log(`%c[MESH-SERVICE] Saving mesh data for ${meshData.videoId}`, 'color: #FF6B6B; font-weight: bold;');
      console.log(`%c[MESH-SERVICE] 📥 INPUT: ${meshData.frames?.length || 0} frames`, 'color: #FF6B6B; font-weight: bold;');

      const now = new Date();
      const frames = meshData.frames || [];

      // Delete old data for this videoId
      console.log(`%c[MESH-SERVICE] 🗑️  Deleting old data for ${meshData.videoId}`, 'color: #FF0000; font-weight: bold;');
      await this.collection.deleteOne({ videoId: meshData.videoId });
      await this.framesCollection.deleteMany({ videoId: meshData.videoId });

      // Save metadata
      const metadataDoc: MeshData = {
        ...meshData,
        frames: [],
        frameCount: frames.length,
        totalFrames: frames.length,
        metadata: {
          ...meshData.metadata,
          uploadedAt: meshData.metadata?.uploadedAt || now,
          processingTime: meshData.metadata?.processingTime || 0,
          extractionMethod: meshData.metadata?.extractionMethod || 'unknown'
        },
        createdAt: now,
        updatedAt: now
      };

      console.log(`%c[MESH-SERVICE] 💾 Saving metadata: frameCount=${frames.length}`, 'color: #FF6B6B; font-weight: bold;');
      await this.collection.insertOne(metadataDoc);

      // Save frames directly without any filtering
      if (frames.length > 0) {
        console.log(`%c[MESH-SERVICE] 💾 Saving ${frames.length} frames`, 'color: #FF6B6B; font-weight: bold;');
        
        const frameDocuments = frames.map((frame: any, index: number) => ({
          videoId: meshData.videoId,
          frameNumber: frame.frameNumber ?? index,
          timestamp: frame.timestamp ?? 0,
          keypoints: frame.keypoints || [],
          skeleton: frame.skeleton || {},
          has3d: frame.has3d || false,
          jointAngles3d: frame.jointAngles3d || {},
          mesh_vertices_data: frame.mesh_vertices_data || [],
          mesh_faces_data: frame.mesh_faces_data || [],
          cameraTranslation: frame.cameraTranslation || null,
          interpolated: false,
          createdAt: now
        }));

        const result = await this.framesCollection.insertMany(frameDocuments, { ordered: false });
        console.log(`%c[MESH-SERVICE] ✅ Inserted ${result.insertedCount} frames`, 'color: #00FF00; font-weight: bold;');
      }

      console.log(`%c[MESH-SERVICE] ========== SAVE COMPLETE ==========`, 'color: #00FF00; font-weight: bold;');
      return meshData.videoId;
    } catch (err) {
      console.error(`%c[MESH-SERVICE] ✗ Error: ${err}`, 'color: #FF0000; font-weight: bold;');
      logger.error(`Failed to save mesh data for ${meshData.videoId}`, { error: err });
      throw err;
    }
  }

  /**
   * Save unified MeshSequence data (video + mesh synchronized)
   */
  async saveMeshSequence(sequence: MeshSequence): Promise<string> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const existing = await this.collection.findOne({ videoId: sequence.videoId });
      if (existing) {
        logger.info(`Mesh sequence already exists for video ${sequence.videoId}`, {
          videoId: sequence.videoId
        });
        return sequence.videoId;
      }

      const now = new Date();
      const data: MeshData = {
        videoId: sequence.videoId,
        videoUrl: sequence.videoUrl,
        fps: sequence.fps,
        videoDuration: sequence.videoDuration,
        frameCount: sequence.totalFrames,
        totalFrames: sequence.totalFrames,
        frames: sequence.frames,
        metadata: sequence.metadata,
        createdAt: now,
        updatedAt: now
      };

      await this.collection.updateOne(
        { videoId: sequence.videoId },
        { $set: data },
        { upsert: true }
      );

      logger.info(`Saved unified mesh sequence for video ${sequence.videoId}`, {
        videoId: sequence.videoId,
        totalFrames: sequence.totalFrames,
        fps: sequence.fps,
        videoDuration: sequence.videoDuration
      });

      return sequence.videoId;
    } catch (err) {
      logger.error(`Failed to save mesh sequence for ${sequence.videoId}`, { error: err });
      throw err;
    }
  }

  async getMeshData(videoId: string): Promise<MeshData | null> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      console.log(`[MESH-SERVICE] Querying metadata for ${videoId}`);
      const data = await this.collection.findOne({ videoId });
      
      if (!data) {
        console.log(`[MESH-SERVICE] ✗ No metadata found for ${videoId}`);
        return null;
      }

      console.log(`[MESH-SERVICE] ✓ Found metadata for ${videoId}:`, {
        frameCount: data.frameCount,
        fps: data.fps,
        videoDuration: data.videoDuration,
        role: data.role
      });

      // Retrieve frames from dedicated collection
      console.log(`%c[MESH-SERVICE] 🔍 QUERYING frames for videoId: ${videoId}`, 'color: #4ECDC4; font-weight: bold;');
      const frames = await this.framesCollection
        .find({ videoId })
        .sort({ frameNumber: 1 })
        .toArray() as any[];
      
      console.log(`%c[MESH-SERVICE] ✓ Retrieved ${frames.length} frames for ${videoId}`, 'color: #4ECDC4; font-weight: bold;');
      
      if (frames.length > 0) {
        console.log(`%c[MESH-SERVICE] 📊 First frame FROM DB:`, 'color: #4ECDC4;', {
          videoId: frames[0].videoId,
          frameNumber: frames[0].frameNumber,
          timestamp: frames[0].timestamp,
          hasKeypoints: !!frames[0].keypoints,
          keypointCount: frames[0].keypoints?.length || 0,
          keypointType: typeof frames[0].keypoints,
          allKeys: Object.keys(frames[0]).sort(),
          fullFrame: JSON.stringify(frames[0]).substring(0, 300)
        });
        
        // CRITICAL: Verify all frames have correct videoId
        const wrongVideoIds = frames.filter(f => f.videoId !== videoId);
        if (wrongVideoIds.length > 0) {
          console.error(`%c[MESH-SERVICE] ❌ CRITICAL: FOUND ${wrongVideoIds.length} frames with WRONG videoId!`, 'color: #FF0000; font-weight: bold; font-size: 14px;');
          wrongVideoIds.slice(0, 5).forEach((f, i) => {
            console.error(`%c[MESH-SERVICE] ❌ Frame ${i}: expected=${videoId}, got=${f.videoId}`, 'color: #FF0000;');
          });
          
          // This is a critical data integrity issue - log it and throw
          throw new Error(`Data integrity error: Retrieved frames with wrong videoId. Expected ${videoId}, found ${wrongVideoIds[0].videoId}`);
        }
        
        console.log(`%c[MESH-SERVICE] ✅ Verified: All ${frames.length} frames have correct videoId`, 'color: #00FF00; font-weight: bold;');
        
        // Additional verification: check keypoint data is not empty
        const emptyKeypointFrames = frames.filter(f => !f.keypoints || f.keypoints.length === 0);
        if (emptyKeypointFrames.length > 0) {
          console.warn(`%c[MESH-SERVICE] ⚠️  WARNING: ${emptyKeypointFrames.length} frames have empty keypoints!`, 'color: #FFAA00; font-weight: bold;');
        }
      }
      
      data.frames = frames as any;
      
      logger.info(`Retrieved mesh data for video ${videoId}`, {
        videoId,
        frameCount: data.frameCount,
        fps: data.fps,
        retrievedFrames: frames.length
      });

      return data;
    } catch (err) {
      console.error(`[MESH-SERVICE] ✗ Error retrieving mesh data for ${videoId}:`, err);
      logger.error(`Failed to retrieve mesh data for ${videoId}`, { error: err });
      throw err;
    }
  }

  /**
   * Get a single frame by videoId and frameNumber
   * 
   * DISABLED: Frame index mapping and interpolation are now handled by PHALP
   * Simply retrieves the frame as-is from the database
   */
  async getFrame(videoId: string, frameNumber: number): Promise<any | null> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Direct query - no frame index mapping or interpolation
      const frame = await this.framesCollection.findOne({ videoId, frameNumber });
      
      // Apply Kalman smoothing directly to keypoints if enabled
      if (frame && this.smoothingEnabled && frame.keypoints && Array.isArray(frame.keypoints) && frame.keypoints.length > 0) {
        try {
          // Smooth each keypoint's coordinates directly
          const smoothedKeypoints = frame.keypoints.map((kp: any) => {
            // Create a temporary SyncedFrame just for this keypoint
            const tempFrame: SyncedFrame = {
              frameIndex: frame.frameNumber,
              timestamp: frame.timestamp,
              meshData: {
                keypoints: [{
                  index: kp.index || 0,
                  name: kp.name || '',
                  position: [kp.x || 0, kp.y || 0, kp.z || 0],
                  confidence: kp.confidence || 0
                }],
                skeleton: [],
                vertices: [],
                faces: []
              }
            };

            const smoothed = kalmanSmoothingService.smoothFrame(tempFrame);
            const smoothedKp = smoothed.meshData.keypoints[0];

            // Return in original format
            return {
              ...kp,
              x: smoothedKp.position[0],
              y: smoothedKp.position[1],
              z: smoothedKp.position[2],
              confidence: smoothedKp.confidence
            };
          });

          return {
            ...frame,
            keypoints: smoothedKeypoints
          };
        } catch (smoothingErr) {
          logger.warn(`Kalman smoothing failed for frame ${videoId}/${frameNumber}, returning unsmoothed:`, smoothingErr);
          return frame;
        }
      }
      
      return frame;
    } catch (err) {
      logger.error(`Failed to retrieve frame ${videoId}/${frameNumber}`, { error: err });
      throw err;
    }
  }

  /**
   * Get multiple frames by videoId and frame range
   * 
   * DISABLED: Frame index mapping and interpolation are now handled by PHALP
   * Simply retrieves frames as-is from the database
   */
  async getFrameRange(videoId: string, startFrame: number, endFrame: number): Promise<any[]> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Direct query - no frame index mapping or interpolation
      const frames = await this.framesCollection
        .find({
          videoId,
          frameNumber: { $gte: startFrame, $lte: endFrame }
        })
        .sort({ frameNumber: 1 })
        .toArray();

      return frames;
    } catch (err) {
      logger.error(`Failed to retrieve frame range ${videoId}/${startFrame}-${endFrame}`, { error: err });
      throw err;
    }
  }

  async getMeshDataByIds(videoIds: string[]): Promise<Map<string, MeshData>> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const results = await this.collection.find({ videoId: { $in: videoIds } }).toArray();
      const map = new Map<string, MeshData>();
      
      results.forEach(data => {
        map.set(data.videoId, data);
      });

      logger.info(`Retrieved mesh data for ${results.length} videos`);
      return map;
    } catch (err) {
      logger.error('Failed to retrieve mesh data batch', { error: err });
      throw err;
    }
  }

  async deleteMeshData(videoId: string): Promise<boolean> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      console.log(`%c[MESH-SERVICE] 🗑️  DELETING mesh data for ${videoId}`, 'color: #FF6B6B; font-weight: bold; font-size: 14px;');
      
      // Delete metadata
      console.log(`%c[MESH-SERVICE] 🗑️  Deleting metadata for ${videoId}`, 'color: #FF6B6B;');
      const metaResult = await this.collection.deleteOne({ videoId });
      console.log(`%c[MESH-SERVICE] ✓ Deleted metadata: ${metaResult.deletedCount} document(s)`, 'color: #FF6B6B;');
      
      // Delete all frames for this video
      console.log(`%c[MESH-SERVICE] 🗑️  Deleting frames for ${videoId}`, 'color: #FF6B6B;');
      const framesResult = await this.framesCollection.deleteMany({ videoId });
      console.log(`%c[MESH-SERVICE] ✓ Deleted frames: ${framesResult.deletedCount} document(s)`, 'color: #FF6B6B;');
      
      logger.info(`Deleted mesh data for video ${videoId}`, {
        videoId,
        metadataDeleted: metaResult.deletedCount,
        framesDeleted: framesResult.deletedCount
      });
      
      return metaResult.deletedCount > 0;
    } catch (err) {
      console.error(`%c[MESH-SERVICE] ✗ Error deleting mesh data for ${videoId}:`, 'color: #FF0000; font-weight: bold;', err);
      logger.error(`Failed to delete mesh data for ${videoId}`, { error: err });
      throw err;
    }
  }

  async getAllMeshData(): Promise<MeshData[]> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const data = await this.collection.find({}).sort({ createdAt: -1 }).toArray();
      if (data.length > 0) {
        logger.info(`✓ Retrieved ${data.length} mesh data entries`);
      }
      return data;
    } catch (err) {
      logger.error('Failed to retrieve all mesh data', { error: err });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
      logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Enable or disable Kalman smoothing for keypoints
   */
  setSmoothingEnabled(enabled: boolean): void {
    this.smoothingEnabled = enabled;
    logger.info(`Kalman smoothing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if smoothing is enabled
   */
  isSmoothingEnabled(): boolean {
    return this.smoothingEnabled;
  }

  /**
   * Reset Kalman filters (call when loading a new video)
   */
  resetSmoothing(): void {
    kalmanSmoothingService.reset();
    logger.info('Kalman filters reset');
  }

  /**
   * Adjust Kalman filter parameters
   * @param processNoise Lower = smoother but more lag (default: 0.01)
   * @param measurementNoise Higher = more smoothing (default: 4.0)
   */
  setSmoothingParameters(processNoise: number, measurementNoise: number): void {
    kalmanSmoothingService.setParameters(processNoise, measurementNoise);
    logger.info(`Kalman parameters updated: processNoise=${processNoise}, measurementNoise=${measurementNoise}`);
  }

  /**
   * Enable or disable frame interpolation
   */
  setInterpolationEnabled(enabled: boolean): void {
    this.interpolationEnabled = enabled;
    logger.info(`Frame interpolation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if frame interpolation is enabled
   */
  isInterpolationEnabled(): boolean {
    return this.interpolationEnabled;
  }

  /**
   * Initialize interpolation service for a video
   * 
   * @param videoId - The video ID
   * @param sourceFrameIndices - Array of frame indices that have pose data
   * @param totalVideoFrames - Total number of frames in the video
   */
  async initializeInterpolation(
    videoId: string,
    sourceFrameIndices: number[],
    totalVideoFrames: number
  ): Promise<void> {
    this.interpolationService.initialize(sourceFrameIndices, totalVideoFrames);
    logger.info(`Interpolation initialized for video ${videoId}`, {
      sourceFrames: sourceFrameIndices.length,
      totalFrames: totalVideoFrames,
      missingFrames: totalVideoFrames - sourceFrameIndices.length
    });
  }

  /**
   * Build a cache of source frames for interpolation
   * 
   * @param videoId - The video ID
   * @returns Map of frame index to frame data
   */
  private async buildSourceFramesCache(videoId: string): Promise<Map<number, any>> {
    const sourceFrames = new Map<number, any>();
    
    try {
      const frames = await this.framesCollection!
        .find({ videoId })
        .sort({ frameNumber: 1 })
        .toArray();

      frames.forEach((frame: any) => {
        sourceFrames.set(frame.frameNumber, frame);
      });

      logger.debug(`Built source frames cache for video ${videoId}`, {
        frameCount: sourceFrames.size
      });
    } catch (err) {
      logger.error(`Failed to build source frames cache for video ${videoId}`, { error: err });
    }

    return sourceFrames;
  }

  /**
   * Convert interpolated frame to database frame format
   * 
   * @param interpolatedFrame - The interpolated frame
   * @returns Frame in database format
   */
  private convertInterpolatedFrameToDatabase(interpolatedFrame: any): any {
    return {
      videoId: '', // Will be set by caller
      frameNumber: interpolatedFrame.frameIndex,
      timestamp: interpolatedFrame.timestamp,
      keypoints: interpolatedFrame.keypoints,
      skeleton: interpolatedFrame.skeleton,
      has3d: false,
      jointAngles3d: {},
      mesh_vertices_data: interpolatedFrame.mesh_vertices_data,
      mesh_faces_data: interpolatedFrame.mesh_faces_data,
      cameraTranslation: interpolatedFrame.cameraTranslation,
      interpolated: interpolatedFrame.interpolated,
      createdAt: new Date()
    };
  }

  /**
   * Get interpolation statistics
   */
  getInterpolationStatistics(): any {
    return this.interpolationService.getStatistics();
  }

  /**
   * Clear interpolation cache
   */
  clearInterpolationCache(): void {
    this.interpolationService.clearCache();
    this.sourceFramesCache.clear();
    logger.info('Interpolation cache cleared');
  }

  /**
   * Reset interpolation service
   */
  resetInterpolation(): void {
    this.interpolationService.reset();
    this.sourceFramesCache.clear();
    logger.info('Interpolation service reset');
  }
}

export { DatabaseFrame };
export const meshDataService = new MeshDataService();
