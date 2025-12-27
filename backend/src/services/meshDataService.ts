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
   * Analyzes frame quality, removes low-quality frames, interpolates outliers,
   * and creates frame index mapping for synchronization.
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
    try {
      console.log(`[MESH-SERVICE] 🔍 Applying frame quality filtering for ${videoId}`);

      // Initialize analyzer and filter service
      const analyzer = new FrameQualityAnalyzer(videoDimensions, {
        minConfidence: frameQualityConfig.MIN_CONFIDENCE,
        boundaryThreshold: frameQualityConfig.BOUNDARY_THRESHOLD,
        offScreenConfidence: frameQualityConfig.OFF_SCREEN_CONFIDENCE,
        outlierDeviationThreshold: frameQualityConfig.OUTLIER_DEVIATION_THRESHOLD,
        trendWindowSize: frameQualityConfig.TREND_WINDOW_SIZE
      });

      const filterService = new FrameFilterService({
        maxInterpolationGap: frameQualityConfig.MAX_INTERPOLATION_GAP,
        debugMode: frameQualityConfig.DEBUG_MODE
      });

      // Step 1: Analyze frame quality
      console.log(`[MESH-SERVICE] 📊 Analyzing quality of ${frames.length} frames`);
      const qualities = analyzer.analyzeSequence(
        frames.map(f => ({ keypoints: f.keypoints || [] }))
      );

      // Step 2: Filter and interpolate
      console.log(`[MESH-SERVICE] 🔧 Filtering and interpolating frames`);
      const filtered = filterService.filterAndInterpolate(frames, qualities);

      // Step 3: Create frame index mapping
      console.log(`[MESH-SERVICE] 🗺️  Creating frame index mapping`);
      const mapping = FrameIndexMapper.createMapping(
        videoId,
        frames.length,
        filtered.removedFrames,
        filtered.interpolatedFrames
      );

      const stats = FrameIndexMapper.getStatistics(mapping);

      console.log(`[MESH-SERVICE] ✅ Frame quality filtering complete:`, {
        originalCount: filtered.statistics.originalCount,
        processedCount: filtered.statistics.processedCount,
        removedCount: filtered.statistics.removedCount,
        interpolatedCount: filtered.statistics.interpolatedCount,
        removalPercentage: stats.removalPercentage,
        interpolationPercentage: stats.interpolationPercentage
      });

      return {
        filteredFrames: filtered.frames,
        frameIndexMapping: FrameIndexMapper.serialize(mapping),
        qualityStats: {
          originalCount: filtered.statistics.originalCount,
          processedCount: filtered.statistics.processedCount,
          removedCount: filtered.statistics.removedCount,
          interpolatedCount: filtered.statistics.interpolatedCount,
          removalPercentage: stats.removalPercentage,
          interpolationPercentage: stats.interpolationPercentage
        }
      };
    } catch (err) {
      logger.error(`Failed to apply frame quality filtering for ${videoId}`, { error: err });
      // Don't throw - continue with unfiltered frames
      console.warn(`[MESH-SERVICE] ⚠️  Frame quality filtering failed, continuing with unfiltered frames`);
      return {
        filteredFrames: frames,
        frameIndexMapping: undefined,
        qualityStats: undefined
      };
    }
  }

  async saveMeshData(meshData: Omit<MeshData, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      console.log(`[MESH-SERVICE] ========== SAVE MESH DATA START ==========`);
      console.log(`[MESH-SERVICE] Saving mesh data for ${meshData.videoId}`);
      console.log(`[MESH-SERVICE] Data details:`, {
        videoId: meshData.videoId,
        frameCount: meshData.frames?.length || 0,
        fps: meshData.fps,
        videoDuration: meshData.videoDuration,
        role: meshData.role
      });

      // CRITICAL: Disable smoothing during save to avoid data loss
      const wasSmoothing = this.smoothingEnabled;
      this.smoothingEnabled = false;

      // CRITICAL: Always delete old data for this videoId first to ensure fresh data
      console.log(`%c[MESH-SERVICE] 🗑️  CRITICAL: Deleting ALL old data for ${meshData.videoId}`, 'color: #FF0000; font-weight: bold; font-size: 14px;');
      
      // Delete metadata
      const metaDeleteResult = await this.collection.deleteOne({ videoId: meshData.videoId });
      console.log(`%c[MESH-SERVICE] ✓ Deleted ${metaDeleteResult.deletedCount} old metadata document(s)`, 'color: #FF0000;');
      
      // Delete ALL frames for this videoId - this is critical!
      const frameDeleteResult = await this.framesCollection.deleteMany({ videoId: meshData.videoId });
      console.log(`%c[MESH-SERVICE] ✓ Deleted ${frameDeleteResult.deletedCount} old frame document(s)`, 'color: #FF0000; font-weight: bold;');
      
      // Verify deletion worked
      const verifyCount = await this.framesCollection.countDocuments({ videoId: meshData.videoId });
      if (verifyCount > 0) {
        console.error(`%c[MESH-SERVICE] ❌ CRITICAL ERROR: ${verifyCount} frames still exist after deletion!`, 'color: #FF0000; font-weight: bold; font-size: 14px;');
        this.smoothingEnabled = wasSmoothing; // Restore smoothing state
        throw new Error(`Failed to delete old frames for ${meshData.videoId}: ${verifyCount} frames still exist`);
      }
      console.log(`%c[MESH-SERVICE] ✅ Verified: 0 frames remain for ${meshData.videoId}`, 'color: #00FF00; font-weight: bold;');

      const now = new Date();
      const frames = meshData.frames || [];

      // Apply frame quality filtering
      const videoDimensions = { width: 1920, height: 1080 }; // Default, can be extracted from video metadata
      const { filteredFrames, frameIndexMapping, qualityStats } = await this.applyFrameQualityFiltering(
        meshData.videoId,
        frames as any[],
        videoDimensions
      );

      // Save metadata document (without frames)
      const metadataDoc: MeshData = {
        ...meshData,
        frames: [], // Don't store frames in metadata
        frameCount: filteredFrames.length,
        totalFrames: filteredFrames.length,
        metadata: {
          ...meshData.metadata,
          uploadedAt: meshData.metadata?.uploadedAt || now,
          processingTime: meshData.metadata?.processingTime || 0,
          extractionMethod: meshData.metadata?.extractionMethod || 'unknown',
          frameIndexMapping,
          qualityStats
        },
        createdAt: now,
        updatedAt: now
      };

      console.log(`[MESH-SERVICE] Saving metadata document`);
      await this.collection.updateOne(
        { videoId: meshData.videoId },
        { $set: metadataDoc },
        { upsert: true }
      );
      console.log(`[MESH-SERVICE] ✓ Metadata saved`);

      // Save frames to dedicated collection
      if (filteredFrames.length > 0) {
        console.log(`%c[MESH-SERVICE] 💾 SAVING ${filteredFrames.length} frames for videoId: ${meshData.videoId}`, 'color: #FF6B6B; font-weight: bold;');
        console.log(`%c[MESH-SERVICE] 📋 First frame structure BEFORE save:`, 'color: #FF6B6B;', {
          videoId: meshData.videoId,
          frameNumber: (filteredFrames[0] as any).frameNumber,
          timestamp: (filteredFrames[0] as any).timestamp,
          keypointCount: (filteredFrames[0] as any).keypoints?.length || 0,
          skeletonExists: !!(filteredFrames[0] as any).skeleton,
          fullFrame: JSON.stringify(filteredFrames[0]).substring(0, 300)
        });
        
        const frameDocuments = filteredFrames.map((frame: any, index: number) => {
          const doc = {
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
            interpolated: frame.interpolated || false,
            createdAt: now
          };
          return doc;
        });

        console.log(`%c[MESH-SERVICE] 📝 First frame document TO SAVE:`, 'color: #FF6B6B;', {
          videoId: frameDocuments[0].videoId,
          frameNumber: frameDocuments[0].frameNumber,
          keypointCount: frameDocuments[0].keypoints?.length || 0,
          fullDoc: JSON.stringify(frameDocuments[0]).substring(0, 300)
        });

        // Batch insert frames - use ordered: true to catch any issues
        console.log(`%c[MESH-SERVICE] 📥 INSERTING ${frameDocuments.length} new frames`, 'color: #FF6B6B; font-weight: bold;');
        try {
          const insertResult = await this.framesCollection.insertMany(frameDocuments, { ordered: true });
          console.log(`%c[MESH-SERVICE] ✅ Successfully inserted ${insertResult.insertedCount} frames`, 'color: #00FF00; font-weight: bold;');
        } catch (err: any) {
          // Log the error but don't fail - might be duplicate key errors
          console.error(`%c[MESH-SERVICE] ⚠️  Insert error (may be duplicates):`, 'color: #FF6B6B;', err.message);
          if (err.code !== 11000) {
            this.smoothingEnabled = wasSmoothing; // Restore smoothing state
            throw err;
          }
        }
        
        // Verify frames were actually saved
        const savedCount = await this.framesCollection.countDocuments({ videoId: meshData.videoId });
        console.log(`%c[MESH-SERVICE] 📊 Verification: ${savedCount} frames now in database for ${meshData.videoId}`, 'color: #00FF00; font-weight: bold;');
        if (savedCount !== frameDocuments.length) {
          console.warn(`%c[MESH-SERVICE] ⚠️  Expected ${frameDocuments.length} frames but found ${savedCount}`, 'color: #FFAA00;');
        }
      }

      // Restore smoothing state
      this.smoothingEnabled = wasSmoothing;

      console.log(`[MESH-SERVICE] ========== SAVE MESH DATA COMPLETE ==========`);
      logger.info(`Saved mesh data for video ${meshData.videoId}`, {
        videoId: meshData.videoId,
        frameCount: frames.length,
        fps: meshData.fps,
        hasVideoUrl: !!meshData.videoUrl
      });

      return meshData.videoId;
    } catch (err) {
      console.error(`[MESH-SERVICE] ✗ Error saving mesh data for ${meshData.videoId}:`, err);
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
   * If frame index mapping exists, uses it to map original frame index to processed frame index
   */
  async getFrame(videoId: string, frameNumber: number): Promise<any | null> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Get metadata to check for frame index mapping
      const metadata = await this.collection.findOne({ videoId });
      
      let processedFrameNumber = frameNumber;
      
      // If frame index mapping exists, use it to map original to processed index
      if (metadata?.metadata?.frameIndexMapping) {
        const mapping = FrameIndexMapper.deserialize(metadata.metadata.frameIndexMapping);
        const mappedIndex = FrameIndexMapper.getProcessedIndex(mapping, frameNumber);
        
        if (mappedIndex === undefined) {
          // Frame was removed
          logger.debug(`Frame ${frameNumber} was removed during quality filtering for video ${videoId}`);
          return null;
        }
        
        processedFrameNumber = mappedIndex;
      }

      const frame = await this.framesCollection.findOne({ videoId, frameNumber: processedFrameNumber });
      
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
   * If frame index mapping exists, uses it to map original frame indices to processed frame indices
   */
  async getFrameRange(videoId: string, startFrame: number, endFrame: number): Promise<any[]> {
    if (!this.collection || !this.framesCollection) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Get metadata to check for frame index mapping
      const metadata = await this.collection.findOne({ videoId });
      
      let processedStartFrame = startFrame;
      let processedEndFrame = endFrame;
      
      // If frame index mapping exists, use it to map original to processed indices
      if (metadata?.metadata?.frameIndexMapping) {
        const mapping = FrameIndexMapper.deserialize(metadata.metadata.frameIndexMapping);
        
        // Find the first and last valid processed frames in the range
        let firstProcessedFrame: number | undefined;
        let lastProcessedFrame: number | undefined;
        
        for (let i = startFrame; i <= endFrame; i++) {
          const processedIndex = FrameIndexMapper.getProcessedIndex(mapping, i);
          if (processedIndex !== undefined) {
            if (firstProcessedFrame === undefined) {
              firstProcessedFrame = processedIndex;
            }
            lastProcessedFrame = processedIndex;
          }
        }
        
        if (firstProcessedFrame === undefined || lastProcessedFrame === undefined) {
          // No valid frames in range
          return [];
        }
        
        processedStartFrame = firstProcessedFrame;
        processedEndFrame = lastProcessedFrame;
      }

      return await this.framesCollection
        .find({
          videoId,
          frameNumber: { $gte: processedStartFrame, $lte: processedEndFrame }
        })
        .sort({ frameNumber: 1 })
        .toArray();
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
}

export { DatabaseFrame };
export const meshDataService = new MeshDataService();
