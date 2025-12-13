const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NGROK_PATH = 'C:\\Program Files\\ngrok.exe';

/**
 * Fetches the ngrok public URL from the ngrok API
 */
function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data);
          const httpTunnel = tunnels.tunnels.find(t => t.proto === 'http');
          if (httpTunnel) {
            resolve(httpTunnel.public_url);
          } else {
            reject('No HTTP tunnel found');
          }
        } catch (e) {
          reject('Failed to parse ngrok response: ' + e.message);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Updates the config file with the ngrok URL
 */
async function updateConfig() {
  try {
    console.log('Waiting for ngrok to start...');
    
    // Wait for ngrok to initialize (increased timeout)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const ngrokUrl = await getNgrokUrl();
    console.log('✓ Ngrok URL found:', ngrokUrl);
    
    const configPath = path.join(__dirname, 'backend/mobile/src/config.ts');
    const configContent = `/**
 * App Configuration
 */

// Development - Using ngrok tunnel
export const API_URL = '${ngrokUrl}';

// Local IP fallback (uncomment to use instead of ngrok)
// export const API_URL = 'http://192.168.1.153:3001';

// Production (uncomment when deploying)
// export const API_URL = 'https://snowboarding-explained.vercel.app';

export const config = {
  apiUrl: API_URL,
  timeout: 30000,
  retryAttempts: 3,
};

export const DEBUG = true;
`;
    
    fs.writeFileSync(configPath, configContent);
    console.log('✓ Config updated with ngrok URL');
    console.log('✓ Ready to start mobile app');
    
  } catch (error) {
    console.error('✗ Error:', error);
    console.error('Make sure ngrok is running on port 3001');
    process.exit(1);
  }
}

updateConfig();
