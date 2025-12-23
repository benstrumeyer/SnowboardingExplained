/**
 * Test script for /api/upload-video-with-pose endpoint
 * Tests the fixed video upload with pose extraction
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/upload-video-with-pose';
const VIDEO_PATH = path.join(__dirname, 'web/public/videoplayback-00.00.09.491-00.00.12.677-seg2.mov');

async function testUploadWithPose() {
  try {
    console.log('🎬 Testing /api/upload-video-with-pose endpoint');
    console.log(`📹 Video: ${VIDEO_PATH}`);
    console.log(`🌐 API: ${API_URL}`);
    
    // Check if video exists
    if (!fs.existsSync(VIDEO_PATH)) {
      console.error(`❌ Video file not found: ${VIDEO_PATH}`);
      process.exit(1);
    }
    
    const videoStats = fs.statSync(VIDEO_PATH);
    console.log(`📊 Video size: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Create form data
    const form = new FormData();
    form.append('video', fs.createReadStream(VIDEO_PATH));
    form.append('role', 'rider');
    
    console.log('\n📤 Uploading video...');
    const startTime = Date.now();
    
    const response = await axios.post(API_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    
    const uploadTime = Date.now() - startTime;
    console.log(`✅ Upload successful (${uploadTime}ms)`);
    console.log(`📋 Response:`, JSON.stringify(response.data, null, 2));
    
    const { videoId, status } = response.data;
    
    if (!videoId) {
      console.error('❌ No videoId in response');
      process.exit(1);
    }
    
    console.log(`\n🔍 Video ID: ${videoId}`);
    console.log(`📊 Status: ${status}`);
    
    // Poll for completion
    if (status === 'processing') {
      console.log('\n⏳ Waiting for processing to complete...');
      
      let completed = false;
      let pollCount = 0;
      const maxPolls = 120; // 2 minutes max
      
      while (!completed && pollCount < maxPolls) {
        await new Promise(r => setTimeout(r, 1000));
        pollCount++;
        
        try {
          const statusResponse = await axios.get(`http://localhost:3001/api/mesh-data/${videoId}`, {
            timeout: 5000,
          });
          
          const jobStatus = statusResponse.data.status;
          console.log(`[${pollCount}s] Status: ${jobStatus}`);
          
          if (jobStatus === 'complete') {
            console.log(`\n✅ Processing complete!`);
            console.log(`📊 Result:`, JSON.stringify(statusResponse.data, null, 2));
            completed = true;
          } else if (jobStatus === 'error') {
            console.error(`\n❌ Processing error:`, statusResponse.data.error);
            process.exit(1);
          }
        } catch (err) {
          console.log(`[${pollCount}s] Still processing...`);
        }
      }
      
      if (!completed) {
        console.error('❌ Timeout waiting for processing');
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testUploadWithPose();
