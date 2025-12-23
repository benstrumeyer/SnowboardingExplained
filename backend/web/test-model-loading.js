#!/usr/bin/env node

/**
 * Manual Test Runner for Model Loading Functionality
 * 
 * This script tests the model loading buttons in each scene by simulating
 * API calls and verifying the responses.
 */

const http = require('http');

const API_URL = 'http://localhost:3001';

// Test configuration
const tests = [
  {
    name: 'Fetch available models list',
    method: 'GET',
    path: '/api/mesh-data/list',
    expectedStatus: 200
  },
  {
    name: 'Load rider model',
    method: 'GET',
    path: '/api/mesh-data/rider-video-1',
    expectedStatus: [200, 404, 202] // 202 = still processing
  },
  {
    name: 'Load coach model',
    method: 'GET',
    path: '/api/mesh-data/coach-video-1',
    expectedStatus: [200, 404, 202]
  }
];

// Helper function to make HTTP requests
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Model Loading Test Suite\n');
  console.log(`Testing API at: ${API_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📝 ${test.name}...`);
      const response = await makeRequest(test.method, test.path);
      
      const expectedStatuses = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus 
        : [test.expectedStatus];
      
      if (expectedStatuses.includes(response.status)) {
        console.log(`   ✅ PASS - Status: ${response.status}`);
        
        // Log response details
        if (response.body.success !== undefined) {
          console.log(`   Success: ${response.body.success}`);
        }
        if (response.body.data) {
          if (Array.isArray(response.body.data)) {
            console.log(`   Data: ${response.body.data.length} items`);
            response.body.data.slice(0, 2).forEach((item, idx) => {
              console.log(`     [${idx}] ${item.videoId || item._id} (${item.role || 'N/A'})`);
            });
          } else if (response.body.data.videoId) {
            console.log(`   VideoId: ${response.body.data.videoId}`);
            console.log(`   Frames: ${response.body.data.totalFrames || response.body.data.frames?.length || 0}`);
            console.log(`   FPS: ${response.body.data.fps}`);
          }
        }
        if (response.body.error) {
          console.log(`   Error: ${response.body.error}`);
        }
        passed++;
      } else {
        console.log(`   ❌ FAIL - Expected status ${expectedStatuses.join(' or ')}, got ${response.status}`);
        if (response.body.error) {
          console.log(`   Error: ${response.body.error}`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ FAIL - ${error.message}`);
      failed++;
    }
    console.log();
  }

  // Summary
  console.log('═'.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
