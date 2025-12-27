/**
 * Debug script to check mesh data in MongoDB
 * Run with: node debug-mesh-data.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('snowboarding');
    const framesCollection = db.collection('mesh_frames');
    
    // Get first frame from first video
    const frame = await framesCollection.findOne({});
    
    if (!frame) {
      console.log('❌ No frames found in database');
      return;
    }
    
    console.log('\n📋 First Frame Structure:');
    console.log('  videoId:', frame.videoId);
    console.log('  frameNumber:', frame.frameNumber);
    console.log('  timestamp:', frame.timestamp);
    console.log('  keypoints count:', frame.keypoints?.length || 0);
    console.log('  skeleton:', frame.skeleton ? Object.keys(frame.skeleton) : 'none');
    console.log('  mesh_vertices_data count:', frame.mesh_vertices_data?.length || 0);
    console.log('  mesh_faces_data count:', frame.mesh_faces_data?.length || 0);
    
    if (frame.mesh_vertices_data && frame.mesh_vertices_data.length > 0) {
      console.log('\n📊 Mesh Vertices Sample:');
      console.log('  First 3 vertices:');
      frame.mesh_vertices_data.slice(0, 3).forEach((v, i) => {
        console.log(`    [${i}]: [${v[0]?.toFixed(3)}, ${v[1]?.toFixed(3)}, ${v[2]?.toFixed(3)}]`);
      });
    }
    
    if (frame.mesh_faces_data && frame.mesh_faces_data.length > 0) {
      console.log('\n📊 Mesh Faces Sample:');
      console.log('  First 3 faces:');
      frame.mesh_faces_data.slice(0, 3).forEach((f, i) => {
        console.log(`    [${i}]: [${f[0]}, ${f[1]}, ${f[2]}]`);
      });
    }
    
    // Check what the API would return
    console.log('\n🔄 What Frontend Would Receive:');
    const syncedFrame = {
      frameIndex: frame.frameNumber,
      timestamp: frame.timestamp,
      meshData: {
        keypoints: (frame.keypoints || []).map((kp, idx) => ({
          index: idx,
          name: kp.name || `keypoint_${idx}`,
          position: Array.isArray(kp.position) ? kp.position : [kp.x || 0, kp.y || 0, kp.z || 0],
          confidence: kp.confidence || 0.5
        })),
        skeleton: frame.skeleton || [],
        vertices: frame.mesh_vertices_data || [],
        faces: frame.mesh_faces_data || []
      }
    };
    
    console.log('  meshData.vertices count:', syncedFrame.meshData.vertices.length);
    console.log('  meshData.faces count:', syncedFrame.meshData.faces.length);
    console.log('  meshData.keypoints count:', syncedFrame.meshData.keypoints.length);
    
    if (syncedFrame.meshData.vertices.length === 0) {
      console.log('\n⚠️  WARNING: No mesh vertices! Mesh will not render.');
      console.log('  This means the pose service returned empty mesh data.');
      console.log('  Check if the pose service is running and returning real HMR2 mesh data.');
    } else {
      console.log('\n✅ Mesh data looks good!');
    }
    
  } finally {
    await client.close();
  }
}

main().catch(console.error);
