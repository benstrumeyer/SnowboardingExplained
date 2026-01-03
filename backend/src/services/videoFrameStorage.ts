import { MongoClient, Db, Collection } from 'mongodb';
import { ExtractedFrame } from './videoFrameExtractor';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let videoFramesCollection: Collection | null = null;

export async function connectToMongoDB(): Promise<void> {
  if (db) return;

  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'snowboarding_explained';

  console.log(`[VIDEO_FRAME_STORAGE] Connecting to MongoDB: ${mongoUrl}`);

  mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  db = mongoClient.db(dbName);
  videoFramesCollection = db.collection('video_frames');

  await videoFramesCollection.createIndex(
    { videoId: 1, frameNumber: 1, meshOverlay: 1 },
    { unique: true }
  );

  console.log(`[VIDEO_FRAME_STORAGE] ✓ Connected to MongoDB`);
}

export async function storeVideoFrames(
  videoId: string,
  frames: ExtractedFrame[]
): Promise<number> {
  if (!videoFramesCollection) {
    throw new Error('Video frames collection not initialized');
  }

  try {
    console.log(`[VIDEO_FRAME_STORAGE] 💾 Storing ${frames.length} video frames for videoId=${videoId}`);

    const docs = frames.map(frame => ({
      videoId,
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
      meshOverlay: frame.videoType === 'overlay',
      imageData: frame.imageBuffer,
      createdAt: new Date(),
    }));

    const result = await videoFramesCollection.insertMany(docs, { ordered: false });

    console.log(`[VIDEO_FRAME_STORAGE] ✓ Stored ${result.insertedCount} video frames`);
    return result.insertedCount;
  } catch (err: any) {
    console.error(`[VIDEO_FRAME_STORAGE] ✗ Error storing video frames: ${err.message}`);
    throw err;
  }
}

export async function getVideoFrame(
  videoId: string,
  frameNumber: number,
  meshOverlay: boolean
): Promise<Buffer | null> {
  if (!videoFramesCollection) {
    throw new Error('Video frames collection not initialized');
  }

  try {
    const doc = await videoFramesCollection.findOne({
      videoId,
      frameNumber,
      meshOverlay,
    });

    if (!doc) {
      return null;
    }

    return doc.imageData;
  } catch (err: any) {
    console.error(`[VIDEO_FRAME_STORAGE] ✗ Error retrieving video frame: ${err.message}`);
    throw err;
  }
}

export async function getVideoFrameCount(
  videoId: string,
  meshOverlay: boolean
): Promise<number> {
  if (!videoFramesCollection) {
    throw new Error('Video frames collection not initialized');
  }

  try {
    const count = await videoFramesCollection.countDocuments({
      videoId,
      meshOverlay,
    });

    return count;
  } catch (err: any) {
    console.error(`[VIDEO_FRAME_STORAGE] ✗ Error counting video frames: ${err.message}`);
    throw err;
  }
}

export async function deleteVideoFrames(videoId: string): Promise<number> {
  if (!videoFramesCollection) {
    throw new Error('Video frames collection not initialized');
  }

  try {
    const result = await videoFramesCollection.deleteMany({ videoId });
    console.log(`[VIDEO_FRAME_STORAGE] ✓ Deleted ${result.deletedCount} video frames for videoId=${videoId}`);
    return result.deletedCount;
  } catch (err: any) {
    console.error(`[VIDEO_FRAME_STORAGE] ✗ Error deleting video frames: ${err.message}`);
    throw err;
  }
}
