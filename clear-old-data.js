#!/usr/bin/env node
const { MongoClient } = require('mongodb');

const mongoUrl = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';

async function clear() {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db('snowboarding');
    
    console.log('🗑️  Clearing old mesh data...');
    const metaResult = await db.collection('mesh_data').deleteMany({});
    const framesResult = await db.collection('mesh_frames').deleteMany({});
    
    console.log(`✅ Deleted ${metaResult.deletedCount} metadata documents`);
    console.log(`✅ Deleted ${framesResult.deletedCount} frame documents`);
  } finally {
    await client.close();
  }
}

clear();
