import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'snowboarding-coach';

  try {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    await client.connect();
    db = client.db(dbName);

    // Verify connection
    await db.admin().ping();
    console.log('✓ Connected to MongoDB');

    return db;
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✓ Disconnected from MongoDB');
  }
}
