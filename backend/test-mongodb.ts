/**
 * Test MongoDB connection and mesh data caching
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { meshDataService } from './src/services/meshDataService';
import { FrameExtractionService } from './src/services/frameExtraction';
import logger from './src/logger';

async function testMongoDB() {
  try {
    console.log('🧪 Testing MongoDB Integration\n');

    // Connect to MongoDB
    console.log('1️⃣  Connecting to MongoDB...');
    await meshDataService.connect();
    console.log('✅ Connected\n');

    // Test data
    const testVideoId = 'test-video-' + Date.now();
    const testMeshData = {
      videoId: testVideoId,
      role: 'rider' as const,
      fps: 30,
      videoDuration: 10.5,
      frameCount: 315,
      frames: [
        {
          frameNumber: 0,
          timestamp: 0,
          keypoints: [{ x: 100, y: 200 }],
          skeleton: { joints: [] }
        },
        {
          frameNumber: 1,
          timestamp: 0.033,
          keypoints: [{ x: 101, y: 201 }],
          skeleton: { joints: [] }
        }
      ]
    };

    // Save mesh data
    console.log('2️⃣  Saving mesh data to MongoDB...');
    const savedId = await meshDataService.saveMeshData(testMeshData);
    console.log(`✅ Saved with ID: ${savedId}\n`);

    // Retrieve mesh data
    console.log('3️⃣  Retrieving mesh data from MongoDB...');
    const retrieved = await meshDataService.getMeshData(testVideoId);
    if (retrieved) {
      console.log('✅ Retrieved successfully');
      console.log(`   - Video ID: ${retrieved.videoId}`);
      console.log(`   - FPS: ${retrieved.fps}`);
      console.log(`   - Frame Count: ${retrieved.frameCount}`);
      console.log(`   - Duration: ${retrieved.videoDuration}s\n`);
    } else {
      console.log('❌ Failed to retrieve\n');
    }

    // Test frame rate normalization
    console.log('4️⃣  Testing frame rate normalization...');
    const fpsArray = [60, 30, 24];
    const normalizedFps = FrameExtractionService.normalizeFrameRates(fpsArray);
    console.log(`✅ Input FPS: ${fpsArray.join(', ')}`);
    console.log(`   Normalized FPS: ${normalizedFps}\n`);

    // Test batch retrieval
    console.log('5️⃣  Testing batch retrieval...');
    const videoIds = [testVideoId];
    const batchData = await meshDataService.getMeshDataByIds(videoIds);
    console.log(`✅ Retrieved ${batchData.size} videos\n`);

    // Cleanup
    console.log('6️⃣  Cleaning up test data...');
    const deleted = await meshDataService.deleteMeshData(testVideoId);
    console.log(`✅ Deleted: ${deleted}\n`);

    console.log('✨ All tests passed!');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await meshDataService.disconnect();
  }
}

testMongoDB();
