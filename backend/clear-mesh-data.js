#!/usr/bin/env node

/**
 * Clear old mesh data from MongoDB
 * 
 * This script deletes all mesh data collections to prepare for fresh uploads
 * with the corrected mesh data storage format.
 * 
 * Usage: node clear-mesh-data.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';

async function clearMeshData() {
  let client = null;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI}`);
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    // Extract database name from connection string
    let dbName = 'snowboarding';
    try {
      const url = new URL(MONGODB_URI);
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        dbName = pathParts[0];
      }
    } catch (err) {
      console.log(`   Could not parse database name from URL, using default: ${dbName}`);
    }
    
    const db = client.db(dbName);
    console.log(`✅ Connected to database: ${dbName}\n`);
    
    // Get collection names
    const collections = await db.listCollections().toArray();
    console.log(`📋 Collections in database:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log();
    
    // Delete mesh_data collection
    if (collections.some(col => col.name === 'mesh_data')) {
      console.log(`🗑️  Deleting mesh_data collection...`);
      const result = await db.collection('mesh_data').deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} documents from mesh_data\n`);
    } else {
      console.log(`⏭️  mesh_data collection not found\n`);
    }
    
    // Delete mesh_frames collection
    if (collections.some(col => col.name === 'mesh_frames')) {
      console.log(`🗑️  Deleting mesh_frames collection...`);
      const result = await db.collection('mesh_frames').deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} documents from mesh_frames\n`);
    } else {
      console.log(`⏭️  mesh_frames collection not found\n`);
    }
    
    // Verify deletion
    console.log(`📊 Verification:`);
    const meshDataCount = await db.collection('mesh_data').countDocuments({});
    const meshFramesCount = await db.collection('mesh_frames').countDocuments({});
    console.log(`   mesh_data: ${meshDataCount} documents`);
    console.log(`   mesh_frames: ${meshFramesCount} documents`);
    
    if (meshDataCount === 0 && meshFramesCount === 0) {
      console.log(`\n✅ SUCCESS: All mesh data cleared!\n`);
      console.log(`📝 Next steps:`);
      console.log(`   1. Upload a test video using the frontend`);
      console.log(`   2. Check browser console for mesh rendering logs`);
      console.log(`   3. Verify mesh appears with correct vertices and faces`);
    } else {
      console.log(`\n⚠️  WARNING: Some data still remains`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log(`\n🔌 Disconnected from MongoDB`);
    }
  }
}

clearMeshData();
