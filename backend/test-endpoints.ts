import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testEndpoints() {
  console.log('Testing API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing /api/health...');
    const healthRes = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
    console.log('✓ Health check passed:', healthRes.data.data.status);
    console.log();

    // Test mesh-data list endpoint
    console.log('2. Testing /api/mesh-data/list...');
    const listRes = await axios.get(`${API_URL}/api/mesh-data/list`, { timeout: 5000 });
    console.log('✓ Mesh data list endpoint working');
    console.log(`  Found ${listRes.data.data.length} models in database`);
    if (listRes.data.data.length > 0) {
      console.log('  Sample model:', {
        videoId: listRes.data.data[0].videoId,
        role: listRes.data.data[0].role,
        frameCount: listRes.data.data[0].frameCount
      });
    }
    console.log();

    // Test mesh-data get endpoint (if models exist)
    if (listRes.data.data.length > 0) {
      const videoId = listRes.data.data[0].videoId;
      console.log(`3. Testing /api/mesh-data/${videoId}...`);
      const getRes = await axios.get(`${API_URL}/api/mesh-data/${videoId}`, { timeout: 5000 });
      console.log('✓ Mesh data retrieval working');
      console.log(`  Retrieved ${getRes.data.data.frameCount} frames`);
      console.log();
    }

    console.log('✅ All endpoints are working correctly!');
  } catch (error: any) {
    console.error('❌ Error testing endpoints:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  Connection refused - is the server running on port 3001?');
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

testEndpoints();
