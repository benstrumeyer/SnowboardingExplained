import { MongoClient, Db, Collection } from 'mongodb';
import { FrameData } from './pickleParserService';

const MONGO_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB_NAME = 'snowboarding_explained';
const FRAMES_COLLECTION = 'frames';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let framesCollection: Collection | null = null;

export async function connectToMongoDB(): Promise<void> {
  if (mongoClient && db && framesCollection) {
    console.log(`[FRAME_STORAGE] Already connected to MongoDB`);
    return;
  }

  try {
    console.log(`[FRAME_STORAGE] 🚀 Connecting to MongoDB: ${MONGO_URL}`);
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    console.log(`[FRAME_STORAGE] ✓ Connected to MongoDB`);

    db = mongoClient.db(DB_NAME);
    console.log(`[FRAME_STORAGE] ✓ Using database: ${DB_NAME}`);

    framesCollection = db.collection(FRAMES_COLLECTION);
    console.log(`[FRAME_STORAGE] ✓ Using collection: ${FRAMES_COLLECTION}`);

    // Create indexes
    await createIndexes();
  } catch (err: any) {
    console.error(`[FRAME_STORAGE] ✗ MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

async function createIndexes(): Promise<void> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  try {
    console.log(`[FRAME_STORAGE] Creating indexes...`);

    // Primary query index: videoId + frameNumber
    await framesCollection.createIndex({ videoId: 1, frameNumber: 1 }, { unique: true });
    console.log(`[FRAME_STORAGE] ✓ Created index: {videoId: 1, frameNumber: 1}`);

    // List all frames for video
    await framesCollection.createIndex({ videoId: 1 });
    console.log(`[FRAME_STORAGE] ✓ Created index: {videoId: 1}`);

    // TTL index for automatic cleanup (30 days)
    await framesCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
    console.log(`[FRAME_STORAGE] ✓ Created TTL index: {createdAt: 1} (30 days)`);
  } catch (err: any) {
    console.warn(`[FRAME_STORAGE] ⚠ Index creation warning: ${err.message}`);
    // Don't throw - indexes may already exist
  }
}

export async function storeFrames(videoId: string, frames: FrameData[]): Promise<void> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  if (frames.length === 0) {
    console.log(`[FRAME_STORAGE] ⚠ No frames to store for videoId=${videoId}`);
    return;
  }

  try {
    console.log(`[FRAME_STORAGE] 🚀 Storing ${frames.length} frames for videoId=${videoId}`);

    const now = new Date();
    const documents = frames.map((frame) => ({
      videoId,
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
      persons: frame.persons,
      createdAt: now,
      updatedAt: now,
    }));

    // Batch insert
    const result = await framesCollection.insertMany(documents, { ordered: false });
    console.log(`[FRAME_STORAGE] ✓ Inserted ${result.insertedCount} frames`);

    if (result.insertedCount !== frames.length) {
      console.warn(
        `[FRAME_STORAGE] ⚠ Inserted ${result.insertedCount} of ${frames.length} frames`
      );
    }
  } catch (err: any) {
    console.error(`[FRAME_STORAGE] ✗ Failed to store frames: ${err.message}`);
    throw err;
  }
}

export async function getFrame(videoId: string, frameNumber: number): Promise<FrameData | null> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  try {
    console.log(`[FRAME_QUERY] Retrieving frame ${frameNumber} for videoId=${videoId}`);

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
    console.log(`[FRAME_QUERY] Retrieving all frames for videoId=${videoId}`);

    const docs = await framesCollection
      .find({ videoId })
      .sort({ frameNumber: 1 })
      .toArray();

    console.log(`[FRAME_QUERY] ✓ Retrieved ${docs.length} frames`);

    return docs.map((doc) => ({
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
    console.log(`[FRAME_QUERY] Retrieving frames ${start}-${end} for videoId=${videoId}`);

    const docs = await framesCollection
      .find({ videoId, frameNumber: { $gte: start, $lte: end } })
      .sort({ frameNumber: 1 })
      .toArray();

    console.log(`[FRAME_QUERY] ✓ Retrieved ${docs.length} frames`);

    return docs.map((doc) => ({
      frameNumber: doc.frameNumber,
      timestamp: doc.timestamp,
      persons: doc.persons,
    }));
  } catch (err: any) {
    console.error(`[FRAME_QUERY] ✗ Failed to get frame range: ${err.message}`);
    throw err;
  }
}

export async function deleteFrames(videoId: string): Promise<number> {
  if (!framesCollection) {
    throw new Error('Frames collection not initialized');
  }

  try {
    console.log(`[FRAME_STORAGE] Deleting all frames for videoId=${videoId}`);

    const result = await framesCollection.deleteMany({ videoId });

    console.log(`[FRAME_STORAGE] ✓ Deleted ${result.deletedCount} frames`);

    return result.deletedCount;
  } catch (err: any) {
    console.error(`[FRAME_STORAGE] ✗ Failed to delete frames: ${err.message}`);
    throw err;
  }
}

export async function closeMongoDB(): Promise<void> {
  if (mongoClient) {
    try {
      console.log(`[FRAME_STORAGE] Closing MongoDB connection...`);
      await mongoClient.close();
      mongoClient = null;
      db = null;
      framesCollection = null;
      console.log(`[FRAME_STORAGE] ✓ MongoDB connection closed`);
    } catch (err: any) {
      console.error(`[FRAME_STORAGE] ✗ Error closing MongoDB: ${err.message}`);
    }
  }
}
