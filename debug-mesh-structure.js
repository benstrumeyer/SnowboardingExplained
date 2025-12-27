const { MongoClient } = require('mongodb');

async function debugMesh() {
  const uri = 'mongodb://admin:password@localhost:27017/snowboarding-explained?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('snowboarding-explained');
    
    // Get mesh data collection
    const meshDataCol = db.collection('mesh_data');
    const framesCol = db.collection('mesh_frames');
    
    // Get latest mesh data
    const meshData = await meshDataCol.findOne({}, { sort: { createdAt: -1 } });
    
    if (!meshData) {
      console.log('❌ No mesh data found');
      return;
    }
    
    console.log('\n📊 MESH DATA METADATA:');
    console.log(`  videoId: ${meshData.videoId}`);
    console.log(`  frameCount: ${meshData.frameCount}`);
    console.log(`  fps: ${meshData.fps}`);
    console.log(`  role: ${meshData.role}`);
    
    // Get frames for this video
    const frames = await framesCol.find({ videoId: meshData.videoId }).limit(1).toArray();
    
    if (frames.length === 0) {
      console.log('\n❌ No frames found in mesh_frames collection');
      return;
    }
    
    const frame = frames[0];
    console.log('\n📊 FIRST FRAME STRUCTURE:');
    console.log(`  frameNumber: ${frame.frameNumber}`);
    console.log(`  timestamp: ${frame.timestamp}`);
    console.log(`  keypoints: ${frame.keypoints ? frame.keypoints.length : 0} items`);
    console.log(`  mesh_vertices_data: ${frame.mesh_vertices_data ? frame.mesh_vertices_data.length : 0} items`);
    console.log(`  mesh_faces_data: ${frame.mesh_faces_data ? frame.mesh_faces_data.length : 0} items`);
    
    if (frame.mesh_vertices_data && frame.mesh_vertices_data.length > 0) {
      console.log('\n📐 VERTEX DATA ANALYSIS:');
      console.log(`  Type of first vertex: ${typeof frame.mesh_vertices_data[0]}`);
      console.log(`  First vertex: ${JSON.stringify(frame.mesh_vertices_data[0])}`);
      console.log(`  Last vertex: ${JSON.stringify(frame.mesh_vertices_data[frame.mesh_vertices_data.length - 1])}`);
      
      // Check if vertices are arrays or numbers
      if (Array.isArray(frame.mesh_vertices_data[0])) {
        console.log(`  ✅ Vertices are arrays (nested format)`);
        console.log(`  First vertex length: ${frame.mesh_vertices_data[0].length}`);
      } else {
        console.log(`  ⚠️  Vertices are flat numbers`);
      }
    }
    
    if (frame.mesh_faces_data && frame.mesh_faces_data.length > 0) {
      console.log('\n📐 FACE DATA ANALYSIS:');
      console.log(`  Type of first face: ${typeof frame.mesh_faces_data[0]}`);
      console.log(`  First face: ${JSON.stringify(frame.mesh_faces_data[0])}`);
      console.log(`  Last face: ${JSON.stringify(frame.mesh_faces_data[frame.mesh_faces_data.length - 1])}`);
      
      // Check if faces are arrays or numbers
      if (Array.isArray(frame.mesh_faces_data[0])) {
        console.log(`  ✅ Faces are arrays (nested format)`);
        console.log(`  First face length: ${frame.mesh_faces_data[0].length}`);
      } else {
        console.log(`  ⚠️  Faces are flat numbers`);
      }
    }
    
    console.log('\n🔍 FULL FRAME KEYS:');
    console.log(`  ${Object.keys(frame).join(', ')}`);
    
  } finally {
    await client.close();
  }
}

debugMesh().catch(console.error);
