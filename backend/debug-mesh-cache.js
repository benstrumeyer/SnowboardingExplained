const { MongoClient } = require('mongodb');
const uri = 'mongodb://admin:password@localhost:27017/meshes?authSource=admin';
const client = new MongoClient(uri);

async function check() {
  try {
    await client.connect();
    const db = client.db('meshes');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n=== COLLECTIONS ===');
    console.log('Collections:', collections.map(c => c.name));
    
    // Check mesh_data collection
    const meshDataCount = await db.collection('mesh_data').countDocuments();
    console.log('\n=== MESH_DATA COLLECTION ===');
    console.log('mesh_data count:', meshDataCount);
    
    // Get all mesh_data documents
    const meshDocs = await db.collection('mesh_data').find({}).toArray();
    console.log('mesh_data documents:');
    meshDocs.forEach(doc => {
      console.log('  - videoId:', doc.videoId);
      console.log('    frameCount:', doc.frameCount);
      console.log('    fps:', doc.fps);
      console.log('    role:', doc.role);
      console.log('    createdAt:', doc.createdAt);
    });
    
    // Check mesh_frames collection
    const framesCount = await db.collection('mesh_frames').countDocuments();
    console.log('\n=== MESH_FRAMES COLLECTION ===');
    console.log('mesh_frames count:', framesCount);
    
    // Get unique videoIds from mesh_frames
    const videoIds = await db.collection('mesh_frames').distinct('videoId');
    console.log('Unique videoIds in mesh_frames:', videoIds);
    
    // For each videoId, count frames
    for (const vid of videoIds) {
      const count = await db.collection('mesh_frames').countDocuments({ videoId: vid });
      console.log('  -', vid, ':', count, 'frames');
      
      // Get first frame for this video
      const firstFrame = await db.collection('mesh_frames').findOne({ videoId: vid });
      if (firstFrame) {
        console.log('    First frame keys:', Object.keys(firstFrame).sort());
        console.log('    First frame keypoints count:', firstFrame.keypoints?.length || 0);
      }
    }
    
    console.log('\n=== MISMATCH CHECK ===');
    // Check for mismatches between mesh_data and mesh_frames
    for (const meshDoc of meshDocs) {
      const framesForVideo = await db.collection('mesh_frames').countDocuments({ videoId: meshDoc.videoId });
      if (framesForVideo !== meshDoc.frameCount) {
        console.log(`⚠️  MISMATCH: ${meshDoc.videoId}`);
        console.log(`   mesh_data says: ${meshDoc.frameCount} frames`);
        console.log(`   mesh_frames has: ${framesForVideo} frames`);
      } else {
        console.log(`✓ ${meshDoc.videoId}: ${framesForVideo} frames (consistent)`);
      }
    }
    
  } finally {
    await client.close();
  }
}

check().catch(console.error);
