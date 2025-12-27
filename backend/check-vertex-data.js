const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://admin:password@localhost:27017/snowboarding?authSource=admin');
  await client.connect();
  const db = client.db('snowboarding');
  
  // Get a few frames
  const frames = await db.collection('mesh_frames').find({}).limit(5).toArray();
  
  console.log('=== VERTEX DATA ANALYSIS ===\n');
  
  frames.forEach((f, i) => {
    console.log(`Frame ${f.frameNumber}:`);
    
    if (f.mesh_vertices_data && f.mesh_vertices_data.length > 0) {
      const vertices = f.mesh_vertices_data;
      
      // Calculate bounding box
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      vertices.forEach(v => {
        if (v[0] < minX) minX = v[0];
        if (v[0] > maxX) maxX = v[0];
        if (v[1] < minY) minY = v[1];
        if (v[1] > maxY) maxY = v[1];
        if (v[2] < minZ) minZ = v[2];
        if (v[2] > maxZ) maxZ = v[2];
      });
      
      console.log(`  Vertices: ${vertices.length}`);
      console.log(`  X range: [${minX.toFixed(3)}, ${maxX.toFixed(3)}] (width: ${(maxX - minX).toFixed(3)})`);
      console.log(`  Y range: [${minY.toFixed(3)}, ${maxY.toFixed(3)}] (height: ${(maxY - minY).toFixed(3)})`);
      console.log(`  Z range: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}] (depth: ${(maxZ - minZ).toFixed(3)})`);
      console.log(`  First vertex: [${vertices[0][0].toFixed(4)}, ${vertices[0][1].toFixed(4)}, ${vertices[0][2].toFixed(4)}]`);
      console.log(`  Center: [${((minX + maxX) / 2).toFixed(3)}, ${((minY + maxY) / 2).toFixed(3)}, ${((minZ + maxZ) / 2).toFixed(3)}]`);
    } else {
      console.log('  No vertex data!');
    }
    
    if (f.mesh_faces_data) {
      console.log(`  Faces: ${f.mesh_faces_data.length}`);
    } else {
      console.log('  No face data!');
    }
    
    console.log('');
  });
  
  await client.close();
}

check().catch(console.error);
