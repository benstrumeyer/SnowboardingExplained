const { MongoClient } = require('mongodb');

async function checkMongoDB() {
  const uri = 'mongodb://localhost:27017/snowboarding-explained';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db('snowboarding-explained');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📦 Collections in database:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Check mesh_data collection
    const meshDataCount = await db.collection('mesh_data').countDocuments();
    console.log(`\n📊 mesh_data collection: ${meshDataCount} documents`);
    
    if (meshDataCount > 0) {
      const meshData = await db.collection('mesh_data').find({}).toArray();
      console.log('\n📋 Mesh data entries:');
      meshData.forEach((doc, idx) => {
        console.log(`  [${idx}] videoId: ${doc.videoId}`);
        console.log(`      frameCount: ${doc.frameCount}`);
        console.log(`      fps: ${doc.fps}`);
        console.log(`      role: ${doc.role}`);
        console.log(`      createdAt: ${doc.createdAt}`);
      });
    }

    // Check mesh_frames collection
    const meshFramesCount = await db.collection('mesh_frames').countDocuments();
    console.log(`\n📊 mesh_frames collection: ${meshFramesCount} documents`);
    
    if (meshFramesCount > 0) {
      const framesByVideo = await db.collection('mesh_frames').aggregate([
        { $group: { _id: '$videoId', count: { $sum: 1 } } }
      ]).toArray();
      console.log('\n📋 Frames by video:');
      framesByVideo.forEach(item => {
        console.log(`  ${item._id}: ${item.count} frames`);
      });
    }

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await client.close();
  }
}

checkMongoDB();
