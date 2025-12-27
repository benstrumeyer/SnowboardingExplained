#!/usr/bin/env node

/**
 * Diagnostic script to check pose service status and data quality
 * 
 * Usage:
 *   node diagnose-pose-service.js
 * 
 * Checks:
 * 1. Pose service health and readiness
 * 2. Model loading status
 * 3. Sample pose detection output
 * 4. Mesh data quality (vertices and faces count)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const POSE_SERVICE_URL = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, ...args) {
  console.log(colors[color] + colors.bright, ...args, colors.reset);
}

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function checkPoseService() {
  log('cyan', '\n═══════════════════════════════════════════════════════════');
  log('cyan', '  POSE SERVICE DIAGNOSTIC');
  log('cyan', '═══════════════════════════════════════════════════════════\n');

  // 1. Check connectivity
  log('blue', '1️⃣  Checking Pose Service Connectivity...');
  try {
    const response = await makeRequest(`${POSE_SERVICE_URL}/health`);
    
    if (response.status === 200) {
      log('green', '   ✅ Pose service is accessible');
      log('green', `   Status: ${response.body.status}`);
      log('green', `   Service: ${response.body.service}`);
      
      if (response.body.models) {
        log('green', `   HMR2: ${response.body.models.hmr2}`);
        log('green', `   ViTDet: ${response.body.models.vitdet}`);
      }
      
      if (response.body.ready) {
        log('green', '   ✅ Models are READY');
      } else {
        log('yellow', '   ⚠️  Models are NOT ready - call /warmup to load them');
      }
    } else {
      log('red', `   ❌ Pose service returned status ${response.status}`);
    }
  } catch (err) {
    log('red', `   ❌ Cannot connect to pose service at ${POSE_SERVICE_URL}`);
    log('red', `   Error: ${err.message}`);
    log('yellow', '   Make sure the pose service is running:');
    log('yellow', '   - WSL: wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"');
    log('yellow', '   - Or: cd backend/pose-service && python app.py');
    return;
  }

  // 2. Check if models need warmup
  log('blue', '\n2️⃣  Checking Model Status...');
  try {
    const response = await makeRequest(`${POSE_SERVICE_URL}/health`);
    
    if (response.body.ready) {
      log('green', '   ✅ Models are loaded and ready');
    } else {
      log('yellow', '   ⚠️  Models not ready. Attempting warmup...');
      
      try {
        const warmupResponse = await makeRequest(`${POSE_SERVICE_URL}/warmup`, 'POST');
        
        if (warmupResponse.status === 200) {
          log('green', '   ✅ Warmup successful');
          log('green', `   Status: ${warmupResponse.body.status}`);
          
          if (warmupResponse.body.hmr2) {
            log('green', `   HMR2 load time: ${warmupResponse.body.hmr2.load_time_seconds}s`);
          }
          if (warmupResponse.body.vitdet) {
            log('green', `   ViTDet load time: ${warmupResponse.body.vitdet.load_time_seconds}s`);
          }
        } else {
          log('red', `   ❌ Warmup failed with status ${warmupResponse.status}`);
        }
      } catch (err) {
        log('red', `   ❌ Warmup error: ${err.message}`);
      }
    }
  } catch (err) {
    log('red', `   ❌ Error checking model status: ${err.message}`);
  }

  // 3. Create a test image and check pose detection
  log('blue', '\n3️⃣  Testing Pose Detection...');
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const response = await makeRequest(`${POSE_SERVICE_URL}/pose/hybrid`, 'POST', {
      image_base64: testImageBase64,
      frame_number: 0
    });

    if (response.status === 200 && response.body) {
      log('green', '   ✅ Pose detection works');
      
      // Check mesh data
      const meshVertices = response.body.mesh_vertices_data || response.body.mesh_vertices || [];
      const meshFaces = response.body.mesh_faces_data || response.body.mesh_faces || [];
      
      log('cyan', `   Mesh vertices: ${meshVertices.length}`);
      log('cyan', `   Mesh faces: ${meshFaces.length}`);
      
      if (meshVertices.length === 4 && meshFaces.length === 3) {
        log('red', '   ❌ DUMMY MESH DATA DETECTED!');
        log('red', '   This is the test/dummy pose service.');
        log('red', '   Expected: ~6,890 vertices and ~13,776 faces (real SMPL mesh)');
        log('yellow', '   Solution: Use the real HMR2 service at backend/pose-service/app.py');
      } else if (meshVertices.length > 1000) {
        log('green', '   ✅ REAL MESH DATA DETECTED!');
        log('green', `   This appears to be real SMPL mesh data.`);
      } else {
        log('yellow', `   ⚠️  Unexpected mesh size: ${meshVertices.length} vertices`);
      }
      
      // Check keypoints
      const keypoints = response.body.keypoints || [];
      log('cyan', `   Keypoints: ${keypoints.length}`);
      
      if (keypoints.length > 0) {
        log('cyan', `   First keypoint: ${keypoints[0].name || 'unnamed'}`);
      }
    } else {
      log('red', `   ❌ Pose detection failed with status ${response.status}`);
      if (response.body && response.body.error) {
        log('red', `   Error: ${response.body.error}`);
      }
    }
  } catch (err) {
    log('red', `   ❌ Pose detection error: ${err.message}`);
  }

  // 4. Check MongoDB for existing mesh data
  log('blue', '\n4️⃣  Checking MongoDB Mesh Data...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/debug-db`, 'GET');
    
    if (response.status === 200 && response.body.data) {
      const data = response.body.data;
      log('green', `   ✅ Found ${data.videoCount} videos in MongoDB`);
      
      if (data.videoCount > 0) {
        log('cyan', `   Latest video: ${data.latestVideo.videoId}`);
        log('cyan', `   Frames: ${data.latestVideo.frameCount}`);
        log('cyan', `   FPS: ${data.latestVideo.fps}`);
        
        // Check mesh data quality
        const firstFrame = data.latestVideo.firstFrame;
        if (firstFrame) {
          const meshVertices = firstFrame.mesh_vertices_data || [];
          const meshFaces = firstFrame.mesh_faces_data || [];
          
          log('cyan', `   First frame mesh vertices: ${meshVertices.length}`);
          log('cyan', `   First frame mesh faces: ${meshFaces.length}`);
          
          if (meshVertices.length === 4 && meshFaces.length === 3) {
            log('red', '   ❌ DUMMY MESH DATA IN DATABASE!');
            log('red', '   Videos were processed with dummy pose service.');
            log('yellow', '   Solution: Re-upload videos after switching to real HMR2 service');
          } else if (meshVertices.length > 1000) {
            log('green', '   ✅ REAL MESH DATA IN DATABASE!');
          }
        }
      }
    } else {
      log('yellow', '   ⚠️  Could not check MongoDB (debug endpoint not available)');
    }
  } catch (err) {
    log('yellow', `   ⚠️  MongoDB check skipped: ${err.message}`);
  }

  // 5. Summary and recommendations
  log('cyan', '\n═══════════════════════════════════════════════════════════');
  log('cyan', '  RECOMMENDATIONS');
  log('cyan', '═══════════════════════════════════════════════════════════\n');

  log('yellow', 'To use the REAL HMR2 pose service:');
  log('yellow', '1. Start the real pose service:');
  log('yellow', '   wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"');
  log('yellow', '2. Verify it\'s running:');
  log('yellow', '   curl http://localhost:5000/health');
  log('yellow', '3. Warmup the models:');
  log('yellow', '   curl -X POST http://localhost:5000/warmup');
  log('yellow', '4. Upload a new video - it will use real mesh data');
  log('yellow', '5. Check the mesh renders correctly in the viewer\n');

  log('yellow', 'To verify mesh data quality:');
  log('yellow', '1. Open browser DevTools (F12)');
  log('yellow', '2. Go to Console tab');
  log('yellow', '3. Look for purple logs with mesh data info');
  log('yellow', '4. Check "Mesh vertices" and "Mesh faces" counts\n');
}

// Run diagnostic
checkPoseService().catch(err => {
  log('red', `\nFatal error: ${err.message}`);
  process.exit(1);
});
