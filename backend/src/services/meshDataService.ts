import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../logger';
import { MeshSequence, SyncedFrame } from '../types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

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
  frames: SyncedFrame[] | MeshFrame[]; // Support both old and new formats
  metadata?: {
    uploadedAt: Date;
    processingTime: number;
    extractionMethod: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

class MeshDataService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<MeshData> | null = null;
  private mongoUrl: string;

  constructor() {
    this.mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/snowboarding';
  }

  async connect(): Promise<void> {
    try {
      if (this.client) {
        return; // Already connected
      }

      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();
      this.db = this.client.db('snowboarding');
      this.collection = this.db.collection<MeshData>('mesh_data');

      // Create indexes (ignore if they already exist)
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

      logger.info('Connected to MongoDB for mesh data storage');
    } catch (err) {
      logger.error('Failed to connect to MongoDB', { error: err });
      throw err;
    }
  }

  async saveMeshData(meshData: Omit<MeshData, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Check if this videoId already exists
      const existing = await this.collection.findOne({ videoId: meshData.videoId });
      if (existing) {
        logger.info(`Mesh data already exists for video ${meshData.videoId}, skipping duplicate`, {
          videoId: meshData.videoId,
          existingId: existing._id
        });
        return meshData.videoId;
      }

      const now = new Date();
      const data: MeshData = {
        ...meshData,
        createdAt: now,
        updatedAt: now
      };

      const result = await this.collection.updateOne(
        { videoId: meshData.videoId },
        { $set: data },
        { upsert: true }
      );

      logger.info(`Saved mesh data for video ${meshData.videoId}`, {
        videoId: meshData.videoId,
        frameCount: meshData.frameCount,
        fps: meshData.fps,
        hasVideoUrl: !!meshData.videoUrl
      });

      return meshData.videoId;
    } catch (err) {
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
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const data = await this.collection.findOne({ videoId });
      
      if (data) {
        logger.info(`Retrieved mesh data for video ${videoId}`, {
          videoId,
          frameCount: data.frameCount,
          fps: data.fps
        });
      }

      return data || null;
    } catch (err) {
      logger.error(`Failed to retrieve mesh data for ${videoId}`, { error: err });
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
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const result = await this.collection.deleteOne({ videoId });
      logger.info(`Deleted mesh data for video ${videoId}`);
      return result.deletedCount > 0;
    } catch (err) {
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
      logger.info(`Retrieved ${data.length} mesh data entries`);
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
}

export const meshDataService = new MeshDataService();
