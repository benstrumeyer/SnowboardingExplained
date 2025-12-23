// Diagnostic script to understand frame extraction issue
// Run with: node diagnose-frame-issue.js

const { MongoClient } = require('mongodb');

async function diagnoseFrameIssue() {
  const uri = 'mongodb://admin:password@localhost:27017/meshes?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n✅ Connected to MongoDB\n');

    const db = client.db('meshes');

    // Get all mesh_data entries
    const meshDataDocs = await db.collection('mesh_data').find({}).toArray();
    
    console.log('========== FRAME EXTRACTION DIAGNOSIS ==========\n');
    console.log(`Found ${meshDataDocs.length} videos\n`);

    for (const doc of meshDataDocs) {
      console.log(`\n📹 Video: ${doc.videoId}`);
      console.log(`   Role: ${doc.role}`);
      console.log(`   FPS: ${doc.fps}`);
      console.log(`   Duration: ${doc.videoDuration}s`);
      console.log(`   Expected frames (fps * duration): ${Math.ceil(doc.fps * doc.videoDuration)}`);
      console.log(`   Metadata frameCount: ${doc.frameCount}`);
      console.log(`   Metadata totalFrames: ${doc.totalFrames}`);
      
      // Count actual frames in database
      const actualFrameCount = await db.collection('mesh_frames').countDocuments({ videoId: doc.videoId });
      console.log(`   Actual frames in DB: ${actualFrameCount}`);
      
      // Check frame numbers
      const frames = await db.collection('mesh_frames')
        .find({ videoId: doc.videoId })
        .sort({ frameNumber: 1 })
        .toArray();
      
      if (frames.length > 0) {
        console.log(`   Frame numbers: ${frames[0].frameNumber} to ${frames[frames.length - 1].frameNumber}`);
        console.log(`   Frame timestamps: ${frames[0].timestamp}ms to ${frames[frames.length - 1].timestamp}ms`);
        
        // Check for gaps
        const gaps = [];
        for (let i = 1; i < frames.length; i++) {
          if (frames[i].frameNumber !== frames[i-1].frameNumber + 1) {
            gaps.push(`Gap between frame ${frames[i-1].frameNumber} and ${frames[i].frameNumber}`);
          }
        }
        if (gaps.length > 0) {
          console.log(`   ⚠️  Gaps detected: ${gaps.join(', ')}`);
        }
      }
      
      console.log(`   Created: ${doc.createdAt}`);
    }

    console.log('\n========== ANALYSIS ==========\n');
    
    // Compare the two videos
    if (meshDataDocs.length === 2) {
      const video1 = meshDataDocs[0];
      const video2 = meshDataDocs[1];
      
      const expectedFrames1 = Math.ceil(video1.fps * video1.videoDuration);
      const expectedFrames2 = Math.ceil(video2.fps * video2.videoDuration);
      
      console.log(`Video 1 (${video1.videoId}):`);
      console.log(`  Expected: ${expectedFrames1} frames`);
      console.log(`  Saved: ${video1.frameCount} frames`);
      console.log(`  Extraction rate: ${(video1.frameCount / expectedFrames1 * 100).toFixed(1)}%`);
      
      console.log(`\nVideo 2 (${video2.videoId}):`);
      console.log(`  Expected: ${expectedFrames2} frames`);
      console.log(`  Saved: ${video2.frameCount} frames`);
      console.log(`  Extraction rate: ${(video2.frameCount / expectedFrames2 * 100).toFixed(1)}%`);
      
      if (video1.frameCount === video2.frameCount) {
        console.log(`\n⚠️  ISSUE: Both videos have same frame count (${video1.frameCount})`);
        console.log(`   This suggests the second video's frames may have been limited`);
        console.log(`   or the first video's frames were not properly deleted.`);
      }
    }

    console.log('\n========== END DIAGNOSIS ==========\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

diagnoseFrameIssue();
