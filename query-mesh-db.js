// MongoDB Query Script for Mesh Database
// Run with: node query-mesh-db.js

const { MongoClient } = require('mongodb');

async function queryMeshDatabase() {
  const uri = 'mongodb://admin:password@localhost:27017/meshes?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');

    const db = client.db('meshes');

    // 1. List all collections
    console.log('========== MESH DATABASE QUERY ==========\n');
    console.log('📦 Collections in database:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => console.log(`  - ${col.name}`));

    // 2. Count documents in each collection
    console.log('\n📊 Document counts:');
    const meshDataCount = await db.collection('mesh_data').countDocuments();
    const meshFramesCount = await db.collection('mesh_frames').countDocuments();
    console.log(`  mesh_data: ${meshDataCount}`);
    console.log(`  mesh_frames: ${meshFramesCount}`);

    // 3. Show all mesh_data entries
    console.log('\n📹 All mesh_data entries:');
    const meshDataDocs = await db.collection('mesh_data').find({}).toArray();
    if (meshDataDocs.length === 0) {
      console.log('  (no entries)');
    } else {
      meshDataDocs.forEach(doc => {
        console.log(`\n  VideoId: ${doc.videoId}`);
        console.log(`  Role: ${doc.role}`);
        console.log(`  FPS: ${doc.fps}`);
        console.log(`  Frame Count: ${doc.frameCount}`);
        console.log(`  Created: ${doc.createdAt}`);
      });
    }

    // 4. Show all mesh_frames entries (grouped by videoId)
    console.log('\n\n🎬 All mesh_frames entries (grouped by videoId):');
    const videoIds = await db.collection('mesh_frames').distinct('videoId');
    if (videoIds.length === 0) {
      console.log('  (no entries)');
    } else {
      for (const videoId of videoIds) {
        const frameCount = await db.collection('mesh_frames').countDocuments({ videoId });
        console.log(`\n  VideoId: ${videoId}`);
        console.log(`  Frame Count: ${frameCount}`);
        
        // Show first frame details
        const firstFrame = await db.collection('mesh_frames').findOne({ videoId });
        if (firstFrame) {
          console.log(`  First Frame Number: ${firstFrame.frameNumber}`);
          console.log(`  Has Keypoints: ${firstFrame.keypoints && firstFrame.keypoints.length > 0}`);
          console.log(`  Has Mesh Data: ${firstFrame.mesh_vertices_data && firstFrame.mesh_vertices_data.length > 0}`);
        }
      }
    }

    // 5. Show indexes
    console.log('\n\n🔍 Indexes:');
    console.log('\n  mesh_data indexes:');
    const meshDataIndexes = await db.collection('mesh_data').getIndexes();
    Object.values(meshDataIndexes).forEach(idx => {
      console.log(`    - ${JSON.stringify(idx.key)}`);
    });

    console.log('\n  mesh_frames indexes:');
    const meshFramesIndexes = await db.collection('mesh_frames').getIndexes();
    Object.values(meshFramesIndexes).forEach(idx => {
      console.log(`    - ${JSON.stringify(idx.key)}`);
    });

    console.log('\n========== END QUERY ==========\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

queryMeshDatabase();
