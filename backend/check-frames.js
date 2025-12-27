const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://admin:password@localhost:27017/snowboarding?authSource=admin');
  await client.connect();
  const db = client.db('snowboarding');
  
  // Get metadata
  const metadata = await db.collection('mesh_data').find({}).toArray();
  console.log('=== MESH METADATA ===');
  metadata.forEach(m => {
    console.log('VideoId:', m.videoId);
    console.log('  frameCount:', m.frameCount);
    console.log('  totalFrames:', m.totalFrames);
    console.log('  fps:', m.fps);
  });
  
  // Get frame counts per video
  console.log('\n=== ACTUAL FRAMES IN mesh_frames COLLECTION ===');
  const pipeline = [
    { $group: { _id: '$videoId', count: { $sum: 1 } } }
  ];
  const frameCounts = await db.collection('mesh_frames').aggregate(pipeline).toArray();
  frameCounts.forEach(fc => {
    console.log('VideoId:', fc._id, '- Frames:', fc.count);
  });
  
  // Sample a few frames
  console.log('\n=== SAMPLE FRAMES ===');
  const sampleFrames = await db.collection('mesh_frames').find({}).limit(3).toArray();
  sampleFrames.forEach((f, i) => {
    console.log('Frame', i, ':', {
      videoId: f.videoId,
      frameNumber: f.frameNumber,
      hasVertices: !!f.mesh_vertices_data,
      vertexCount: f.mesh_vertices_data?.length || 0,
      hasFaces: !!f.mesh_faces_data,
      faceCount: f.mesh_faces_data?.length || 0
    });
  });
  
  await client.close();
}

check().catch(console.error);
