import { MongoClient, Db, Collection, GridFSBucket } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../logger';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

interface VideoFrame {
  frameIndex: number;
  timestamp: number;
  originalVideoFrame?: string; // base64 JPEG
  meshOverlayFrame?: string; // base64 JPEG with 2D mesh overlay
  meshData: {
    keypoints: any[];
    skeleton: any;
  };
}

interface VideoSequence {
  _id?: string;
  videoId: string;
  fps: number;
  totalFrames: number;
  videoDuration: number;
  frames: VideoFrame[];
  createdAt: Date;
  updatedAt: Date;
}

class VideoStorageService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<VideoSequence> | null = null;
  private gridFSBucket: GridFSBucket | null = null;
  private mongoUrl: string;

  constructor() {
    this.mongoUrl = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';
  }

  async connect(): Promise<void> {
    try {
      if (this.client) {
        return;
      }

      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();
      this.db = this.client.db('snowboarding');
      this.collection = this.db.collection<VideoSequence>('video_sequences');
      this.gridFSBucket = new GridFSBucket(this.db, { bucketName: 'video_frames' });

      // Create indexes
      try {
        await this.collection.createIndex({ videoId: 1 }, { unique: true });
      } catch (err: any) {
        if (err.codeName !== 'IndexKeySpecsConflict') {
          throw err;
        }
      }

      logger.info('Connected to MongoDB for video storage');
    } catch (err) {
      logger.error('Failed to connect to MongoDB', { error: err });
      throw err;
    }
  }

  /**
   * Save complete video sequence with all frames
   */
  async saveVideoSequence(sequence: Omit<VideoSequence, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const existing = await this.collection.findOne({ videoId: sequence.videoId });
      if (existing) {
        logger.info(`Video sequence already exists for ${sequence.videoId}, skipping`);
        return sequence.videoId;
      }

      const now = new Date();
      const data: VideoSequence = {
        ...sequence,
        createdAt: now,
        updatedAt: now
      };

      await this.collection.updateOne(
        { videoId: sequence.videoId },
        { $set: data },
        { upsert: true }
      );

      logger.info(`Saved video sequence for ${sequence.videoId}`, {
        videoId: sequence.videoId,
        totalFrames: sequence.totalFrames,
        fps: sequence.fps,
        dataSize: JSON.stringify(data).length
      });

      return sequence.videoId;
    } catch (err) {
      logger.error(`Failed to save video sequence for ${sequence.videoId}`, { error: err });
      throw err;
    }
  }

  /**
   * Get complete video sequence with all frames
   */
  async getVideoSequence(videoId: string): Promise<VideoSequence | null> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const sequence = await this.collection.findOne({ videoId });

      if (sequence) {
        logger.info(`Retrieved video sequence for ${videoId}`, {
          videoId,
          totalFrames: sequence.totalFrames,
          fps: sequence.fps
        });
      }

      return sequence || null;
    } catch (err) {
      logger.error(`Failed to retrieve video sequence for ${videoId}`, { error: err });
      throw err;
    }
  }

  /**
   * Get specific frame from video sequence
   */
  async getVideoFrame(videoId: string, frameIndex: number): Promise<VideoFrame | null> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const sequence = await this.collection.findOne(
        { videoId },
        { projection: { 'frames.$': 1 } }
      );

      if (sequence && sequence.frames && sequence.frames[0]) {
        return sequence.frames[0];
      }

      return null;
    } catch (err) {
      logger.error(`Failed to retrieve frame ${frameIndex} from ${videoId}`, { error: err });
      throw err;
    }
  }

  /**
   * Get all video sequences (for listing)
   */
  async getAllVideoSequences(): Promise<VideoSequence[]> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const sequences = await this.collection
        .find({})
        .project({ frames: 0 }) // Exclude frames for listing
        .sort({ createdAt: -1 })
        .toArray();

      logger.info(`Retrieved ${sequences.length} video sequences`);
      return sequences;
    } catch (err) {
      logger.error('Failed to retrieve video sequences', { error: err });
      throw err;
    }
  }

  /**
   * Delete video sequence
   */
  async deleteVideoSequence(videoId: string): Promise<boolean> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }

    try {
      const result = await this.collection.deleteOne({ videoId });
      logger.info(`Deleted video sequence for ${videoId}`);
      return result.deletedCount > 0;
    } catch (err) {
      logger.error(`Failed to delete video sequence for ${videoId}`, { error: err });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
      this.gridFSBucket = null;
      logger.info('Disconnected from MongoDB');
    }
  }
}

export const videoStorageService = new VideoStorageService();
