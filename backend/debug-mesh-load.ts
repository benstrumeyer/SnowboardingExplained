import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function debugMeshLoad() {
  console.log('=== Debugging Mesh Load ===\n');

  try {
    // Step 1: Check if we have any models in the database
    console.log('Step 1: Fetching all models from /api/mesh-data/list');
    const listRes = await axios.get(`${API_URL}/api/mesh-data/list`, { timeout: 5000 });
    console.log(`✓ Found ${listRes.data.data.length} models`);
    
    if (listRes.data.data.length === 0) {
      console.log('⚠️  No models in database. Upload a video first.');
      return;
    }

    const firstModel = listRes.data.data[0];
    console.log(`\nFirst model:`, {
      videoId: firstModel.videoId,
      role: firstModel.role,
      frameCount: firstModel.frameCount,
      fps: firstModel.fps
    });

    // Step 2: Try to fetch the mesh data for the first model
    console.log(`\nStep 2: Fetching mesh data for ${firstModel.videoId}`);
    const meshRes = await axios.get(`${API_URL}/api/mesh-data/${firstModel.videoId}`, { timeout: 5000 });
    
    console.log(`✓ Got mesh data`);
    console.log(`  - videoId: ${meshRes.data.data.videoId}`);
    console.log(`  - fps: ${meshRes.data.data.fps}`);
    console.log(`  - frameCount: ${meshRes.data.data.frames?.length || 0}`);
    console.log(`  - bodyProportions:`, meshRes.data.data.bodyProportions);

    // Step 3: Check frame structure
    if (meshRes.data.data.frames && meshRes.data.data.frames.length > 0) {
      const firstFrame = meshRes.data.data.frames[0];
      console.log(`\nStep 3: First frame structure:`);
      console.log(`  - frameNumber: ${firstFrame.frameNumber}`);
      console.log(`  - timestamp: ${firstFrame.timestamp}`);
      console.log(`  - vertices: ${firstFrame.vertices?.length || 0} items`);
      console.log(`  - faces: ${firstFrame.faces?.length || 0} items`);
      console.log(`  - normals: ${firstFrame.normals?.length || 0} items`);
    } else {
      console.log(`⚠️  No frames in mesh data!`);
    }

    console.log('\n✅ Mesh load debugging complete');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugMeshLoad();
