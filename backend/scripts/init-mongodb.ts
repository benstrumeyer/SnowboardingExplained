/**
 * Initialize MongoDB collections and indexes
 * Run this script to set up the database schema
 */

import { MongoClient } from 'mongodb';
import logger from '../src/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';

async function initializeMongoDB() {
  let client: MongoClient | null = null;

  try {
    console.log('🔄 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('snowboarding');

    // Create mesh_data collection
    console.log('📦 Creating mesh_data collection...');
    try {
      await db.createCollection('mesh_data');
      console.log('✅ mesh_data collection created');
    } catch (err: any) {
      if (err.codeName === 'NamespaceExists') {
        console.log('ℹ️  mesh_data collection already exists');
      } else {
        throw err;
      }
    }

    // Create indexes for mesh_data
    const meshDataCollection = db.collection('mesh_data');
    
    console.log('🔑 Creating indexes for mesh_data...');
    await meshDataCollection.createIndex({ videoId: 1 }, { unique: true });
    console.log('✅ Created unique index on videoId');

    await meshDataCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 });
    console.log('✅ Created TTL index on createdAt (30 days)');

    await meshDataCollection.createIndex({ role: 1 });
    console.log('✅ Created index on role');

    await meshDataCollection.createIndex({ fps: 1 });
    console.log('✅ Created index on fps');

    // Create frame_cache collection
    console.log('📦 Creating frame_cache collection...');
    try {
      await db.createCollection('frame_cache');
      console.log('✅ frame_cache collection created');
    } catch (err: any) {
      if (err.codeName === 'NamespaceExists') {
        console.log('ℹ️  frame_cache collection already exists');
      } else {
        throw err;
      }
    }

    // Create indexes for frame_cache
    const frameCacheCollection = db.collection('frame_cache');
    
    console.log('🔑 Creating indexes for frame_cache...');
    await frameCacheCollection.createIndex({ videoId: 1 }, { unique: true });
    console.log('✅ Created unique index on videoId');

    await frameCacheCollection.createIndex({ extractedAt: 1 }, { expireAfterSeconds: 86400 * 30 });
    console.log('✅ Created TTL index on extractedAt (30 days)');

    // Verify collections
    console.log('\n📋 Verifying collections...');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Collections:', collectionNames);

    console.log('\n✨ MongoDB initialization complete!');
    console.log('📊 Database: snowboarding');
    console.log('📦 Collections: mesh_data, frame_cache');

  } catch (err) {
    console.error('❌ Error initializing MongoDB:', err);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run initialization
initializeMongoDB();
