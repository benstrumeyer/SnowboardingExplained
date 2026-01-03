import { MongoClient, Db, Collection } from 'mongodb';
import { FrameData } from './pickleParserService';

const MONGO_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB_NAME = 'snowboarding_explained';
const FRAMES_COLLECTION = 'frames';
const VIDEOS_COLLECTION = 'videos';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let framesCollection: Collection | null = null;
let videosCollection: Collection | null = null;

export async function connectToMongoDB(): Promise<void> {
  if (mongoClient && db && framesCollection && videosCollection) {
    console.log(`[FRAME_QUERY_SERVICE] Already connected to MongoDB`);
    return;
  }

  try {
    console.log(`[FRAME_QUERY_SERVICE] 🚀 Connecting to MongoDB: ${MONGO_URL}`);
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    console.log(`[FRAME_QUERY_SERVICE] ✓ Connected to MongoDB`);

    db = mongoClient.db(DB_NAME);
    framesCollection = db.collection(FRAMES_COLLECTION);
    videosCollection = db.collection(VIDEOS_COLLECTION);

    console.log(`[FRAME_QUERY_SERVICE] ✓ Collections initialized`);
  } catch (err: any) {
    console.error(`[FRAME_QUERY_SERVICE] ✗ MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

export interface VideoMetadata {
  videoId: string;
  filename: string;
  fps: number;
  duration: number;
  resolution: [number, number];
  frameCount: number;
  createdAt: Date;
  originalVideoPath?: string;
  overlayVideoPath?: string;
}

export async function getAllVideos(): Promise<VideoMetadata[]> {
  if (!videosCollection) {
    throw new Error('Videos collection not initialized');
  }

  try {
    console.log(`[VIDEO_QUERY] 🔍 Retrieving all videos`);

    const docs = await videosCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`[VIDEO_QUERY] ✓ Retrieved ${docs.length} videos`);

    return docs.map((doc: any) => ({
      videoId: doc.videoId,
      filename: doc.filename,
      fps: doc.fps || 30,
      duration: doc.duration || 0,
      resolution: doc.resolution || [1920, 1080],
      frameCount: doc.frameCount || 0,
      createdAt: doc.createdAt,
      originalVideoPath: doc.originalVideoPath,
      overlayVideoPath: doc.overlayVideoPath,
    }));
  } catch (err: any) {
    console.error(`[VIDEO_QUERY] ✗ Failed to get all videos: ${err.message}`);
    throw err;
  }
}

export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  if (!videosCollection) {
    throw new Error('Videos collection not initialized');
  }

  try {
    console.log(`[VIDEO_QUERY] 🔍 Retrieving metadata for videoId=${videoId}`);

    const doc = await videosCollection.findOne({ videoId });

    if (!doc) {
      console.log(`[VIDEO_QUERY] ⚠ Video not found: videoId=${videoId}`);
      return null;
    }

    console.log(`[VIDEO_QUERY] ✓ Retrieved video metadata`);

    return {
      videoId: doc.videoId,
      filename: doc.filename,
      fps: doc.fps || 30,
      duration: doc.duration || 0,
      resolution: doc.resolution || [1920, 1080],
      frameCount: doc.frameCount || 0,
      createdAt: doc.createdAt,
      originalVideoPath: doc.originalVideoPath,
      overlayVideoPath: doc.overlayVideoPath,
    };
  } catch (err: any) {
    console.error(`[VIDEO_QUERY] ✗ Failed to get video metadata: ${err.message}`);
    throw err;
  }
}

export async function saveVideoMetadata(metadata: VideoMetadata): Promise<void> {
  if (!videosCollection) {
    throw new Error('Videos collection not initialized');
  }

  try {
    console.log(`[VIDEO_STORAGE] 💾 Saving video metadata for videoId=${metadata.videoId}`);

    const now = new Date();
    const doc = {
      videoId: metadata.videoId,
      filename: metadata.filename,
      fps: metadata.fps,
      duration: metadata.duration,
      resolution: metadata.resolution,
      frameCount: metadata.frameCount,
      originalVideoPath: metadata.originalVideoPath,
      overlayVideoPath: metadata.overlayVideoPath,
      createdAt: metadata.createdAt || now,
      updatedAt: now,
    };

    await videosCollection.updateOne({ videoId: metadata.videoId }, { $set: doc }, { upsert: true });

    console.log(`[VIDEO_STORAGE] ✓ Saved video metadata`);
  } catch (err: any) {
    console.error(`[VIDEO_STORAGE] ✗ Failed to save video metadata: ${err.message}`);
    throw err;
  }
}

export async function getFrame(videoId: string, frameNumber: number): Promise<FrameData | null> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  try {
    console.log(`[FRAME_QUERY] 🔍 Retrieving frame ${frameNumber} for videoId=${videoId}`);

    const doc = await framesCollection.findOne({ videoId, frameNumber });

    if (!doc) {
      console.log(`[FRAME_QUERY] ⚠ Frame not found: videoId=${videoId}, frameNumber=${frameNumber}`);
      return null;
    }

    console.log(`[FRAME_QUERY] ✓ Retrieved frame ${frameNumber}`);

    return {
      frameNumber: doc.frameNumber,
      timestamp: doc.timestamp,
      persons: doc.persons,
    };
  } catch (err: any) {
    console.error(`[FRAME_QUERY] ✗ Failed to get frame: ${err.message}`);
    throw err;
  }
}

export async function getAllFrames(videoId: string): Promise<FrameData[]> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  try {
    console.log(`[FRAME_QUERY] 🔍 Retrieving all frames for videoId=${videoId}`);

    const docs = await framesCollection
      .find({ videoId })
      .sort({ frameNumber: 1 })
      .toArray();

    console.log(`[FRAME_QUERY] ✓ Retrieved ${docs.length} frames`);

    return docs.map((doc: any) => ({
      frameNumber: doc.frameNumber,
      timestamp: doc.timestamp,
      persons: doc.persons,
    }));
  } catch (err: any) {
    console.error(`[FRAME_QUERY] ✗ Failed to get all frames: ${err.message}`);
    throw err;
  }
}

export async function getFrameRange(
  videoId: string,
  start: number,
  end: number
): Promise<FrameData[]> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  try {
    console.log(`[FRAME_QUERY] 🔍 Retrieving frames ${start}-${end} for videoId=${videoId}`);

    const docs = await framesCollection
      .find({ videoId, frameNumber: { $gte: start, $lte: end } })
      .sort({ frameNumber: 1 })
      .toArray();

    console.log(`[FRAME_QUERY] ✓ Retrieved ${docs.length} frames`);

    return docs.map((doc: any) => ({
      frameNumber: doc.frameNumber,
      timestamp: doc.timestamp,
      persons: doc.persons,
    }));
  } catch (err: any) {
    console.error(`[FRAME_QUERY] ✗ Failed to get frame range: ${err.message}`);
    throw err;
  }
}

export async function closeMongoDB(): Promise<void> {
  if (mongoClient) {
    try {
      console.log(`[FRAME_QUERY_SERVICE] Closing MongoDB connection...`);
      await mongoClient.close();
      mongoClient = null;
      db = null;
      framesCollection = null;
      videosCollection = null;
      console.log(`[FRAME_QUERY_SERVICE] ✓ MongoDB connection closed`);
    } catch (err: any) {
      console.error(`[FRAME_QUERY_SERVICE] ✗ Error closing MongoDB: ${err.message}`);
    }
  }
}
