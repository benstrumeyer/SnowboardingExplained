#!/usr/bin/env node
/**
 * Diagnostic script to check video upload and frame extraction
 * Usage: node diagnose-upload.js <videoId>
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const mongoUrl = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/snowboarding?authSource=admin';
const videoId = process.argv[2];

if (!videoId) {
  console.error('Usage: node diagnose-upload.js <videoId>');
  process.exit(1);
}

async function diagnose() {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    const db = client.db('snowboarding');
    
    console.log(`\n🔍 Diagnosing video: ${videoId}\n`);
    
    // Check metadata
    const metadata = await db.collection('mesh_data').findOne({ videoId });
    if (!metadata) {
      console.log('❌ No metadata found in mesh_data collection');
    } else {
      console.log('✅ Metadata found:');
      console.log(`   - frameCount: ${metadata.frameCount}`);
      console.log(`   - totalFrames: ${metadata.totalFrames}`);
      console.log(`   - fps: ${metadata.fps}`);
      console.log(`   - videoDuration: ${metadata.videoDuration}`);
      console.log(`   - role: ${metadata.role}`);
      console.log(`   - createdAt: ${metadata.createdAt}`);
    }
    
    // Check frames
    const frameCount = await db.collection('mesh_frames').countDocuments({ videoId });
    console.log(`\n📊 Frames in mesh_frames collection: ${frameCount}`);
    
    if (frameCount > 0) {
      const firstFrame = await db.collection('mesh_frames').findOne({ videoId });
      console.log('\n✅ First frame structure:');
      console.log(`   - frameNumber: ${firstFrame.frameNumber}`);
      console.log(`   - timestamp: ${firstFrame.timestamp}`);
      console.log(`   - keypoints: ${firstFrame.keypoints?.length || 0}`);
      console.log(`   - mesh_vertices_data: ${firstFrame.mesh_vertices_data?.length || 0}`);
      console.log(`   - mesh_faces_data: ${firstFrame.mesh_faces_data?.length || 0}`);
      console.log(`   - has3d: ${firstFrame.has3d}`);
    } else {
      console.log('❌ No frames found in mesh_frames collection');
    }
    
    // Check if video file exists
    const uploadsDir = path.join(__dirname, 'backend', 'uploads');
    const videoFiles = fs.readdirSync(uploadsDir).filter(f => f.includes(videoId));
    console.log(`\n📁 Video files in uploads directory: ${videoFiles.length}`);
    videoFiles.forEach(f => {
      const fullPath = path.join(uploadsDir, f);
      const stats = fs.statSync(fullPath);
      console.log(`   - ${f} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    });
    
    console.log('\n');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

diagnose();
