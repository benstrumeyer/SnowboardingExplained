import { MongoClient, Db } from 'mongodb';

let mongoClient: MongoClient | null = null;
let database: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/snowboarding-explained';
const DB_NAME = process.env.DB_NAME || 'snowboarding-explained';

export async function connectToDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    database = mongoClient.db(DB_NAME);
    console.log(`Connected to MongoDB database: ${DB_NAME}`);
    return database;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    database = null;
    console.log('Disconnected from MongoDB');
  }
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return database;
}

// Export db as a lazy-loaded singleton
export const db = new Proxy({} as Db, {
  get: (target, prop) => {
    if (!database) {
      throw new Error('Database not connected. Call connectToDatabase() first.');
    }
    return (database as any)[prop];
  },
});
