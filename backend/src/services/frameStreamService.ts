import { MongoClient, Db, Collection } from 'mongodb';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let videoFramesCollection: Collection | null = null;

export async function connectToMongoDB(): Promise<void> {
  if (videoFramesCollection) return;

  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'snowboarding_explained';

  mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  db = mongoClient.db(dbName);
  videoFramesCollection = db.collection('video_frames');

  console.log(`[FRAME_STREAM_SERVICE] ✓ Connected to MongoDB`);
}

export async function getFrameBuffer(
  videoId: string,
  frameNumber: number,
  meshOverlay: boolean
): Promise<Buffer | null> {
  if (!videoFramesCollection) {
    await connectToMongoDB();
  }

  if (!videoFramesCollection) {
    throw new Error('Video frames collection not initialized');
  }

  try {
    const doc = await videoFramesCollection.findOne({
      videoId,
      frameNumber,
      meshOverlay,
    });

    if (!doc || !doc.imageData) {
      return null;
    }

    const imageData = doc.imageData;

    if (Buffer.isBuffer(imageData)) {
      return imageData;
    }

    if (imageData._bsontype === 'Binary') {
      return imageData.buffer;
    }

    if (imageData.buffer && typeof imageData.buffer === 'object') {
      return Buffer.from(imageData.buffer);
    }

    if (typeof imageData === 'object' && imageData.$binary) {
      return Buffer.from(imageData.$binary, 'base64');
    }

    return Buffer.from(imageData);
  } catch (err: any) {
    console.error(`[FRAME_STREAM_SERVICE] ✗ Error retrieving frame: ${err.message}`);
    throw err;
  }
}

export async function getFrameCount(
  videoId: string,
  meshOverlay: boolean
): Promise<number> {
  if (!videoFramesCollection) {
    await connectToMongoDB();
  }

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
    console.error(`[FRAME_STREAM_SERVICE] ✗ Error counting frames: ${err.message}`);
    throw err;
  }
}
