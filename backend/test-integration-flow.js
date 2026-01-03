const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const pklPath = '/tmp/video_processing/results.pkl';
const pythonScriptPath = path.join(__dirname, 'src/services/pickle_parser.py');
const pythonPath = path.join(__dirname, 'pose-service/venv/bin/python');

console.log(`[INTEGRATION-TEST] ========================================`);
console.log(`[INTEGRATION-TEST] Testing full pickle parser integration`);
console.log(`[INTEGRATION-TEST] PKL file: ${pklPath}`);
console.log(`[INTEGRATION-TEST] Python script: ${pythonScriptPath}`);
console.log(`[INTEGRATION-TEST] Python executable: ${pythonPath}`);
console.log(`[INTEGRATION-TEST] ========================================`);

if (!fs.existsSync(pklPath)) {
  console.error(`[INTEGRATION-TEST] ✗ PKL file not found: ${pklPath}`);
  process.exit(1);
}

if (!fs.existsSync(pythonPath)) {
  console.error(`[INTEGRATION-TEST] ✗ Python executable not found: ${pythonPath}`);
  process.exit(1);
}

if (!fs.existsSync(pythonScriptPath)) {
  console.error(`[INTEGRATION-TEST] ✗ Python script not found: ${pythonScriptPath}`);
  process.exit(1);
}

const subprocess = spawn(pythonPath, [pythonScriptPath, pklPath], {
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 60000,
});

let stdout = '';
let stderr = '';

subprocess.stdout?.on('data', (data) => {
  const chunk = data.toString();
  stdout += chunk;
  console.log(`[STDOUT] ${chunk.trim().substring(0, 200)}`);
});

subprocess.stderr?.on('data', (data) => {
  const chunk = data.toString();
  stderr += chunk;
  console.log(`[STDERR] ${chunk.trim()}`);
});

subprocess.on('close', (exitCode) => {
  console.log(`[INTEGRATION-TEST] ========================================`);
  console.log(`[INTEGRATION-TEST] Exit code: ${exitCode}`);

  if (exitCode === 0) {
    try {
      const result = JSON.parse(stdout);
      console.log(`[INTEGRATION-TEST] ✓ Successfully parsed JSON`);
      console.log(`[INTEGRATION-TEST] Frame count: ${result.frameCount}`);
      console.log(`[INTEGRATION-TEST] Frames: ${result.frames.length}`);
      
      if (result.frames.length > 0) {
        const firstFrame = result.frames[0];
        console.log(`[INTEGRATION-TEST] First frame:`);
        console.log(`[INTEGRATION-TEST]   - frameNumber: ${firstFrame.frameNumber}`);
        console.log(`[INTEGRATION-TEST]   - timestamp: ${firstFrame.timestamp}`);
        console.log(`[INTEGRATION-TEST]   - persons: ${firstFrame.persons.length}`);
        
        if (firstFrame.persons.length > 0) {
          const person = firstFrame.persons[0];
          console.log(`[INTEGRATION-TEST]   - person[0]:`);
          console.log(`[INTEGRATION-TEST]     - personId: ${person.personId}`);
          console.log(`[INTEGRATION-TEST]     - confidence: ${person.confidence}`);
          console.log(`[INTEGRATION-TEST]     - tracked: ${person.tracked}`);
          console.log(`[INTEGRATION-TEST]     - camera: ${JSON.stringify(person.camera)}`);
        }
      }
      
      console.log(`[INTEGRATION-TEST] ========================================`);
      console.log(`[INTEGRATION-TEST] ✓✓✓ INTEGRATION TEST PASSED ✓✓✓`);
      console.log(`[INTEGRATION-TEST] ========================================`);
      process.exit(0);
    } catch (e) {
      console.error(`[INTEGRATION-TEST] ✗ Failed to parse JSON: ${e.message}`);
      console.error(`[INTEGRATION-TEST] Stdout length: ${stdout.length}`);
      process.exit(1);
    }
  } else {
    console.error(`[INTEGRATION-TEST] ✗ Process exited with code ${exitCode}`);
    console.error(`[INTEGRATION-TEST] Last 500 chars of stderr:`, stderr.slice(-500));
    process.exit(1);
  }
});

subprocess.on('error', (err) => {
  console.error(`[INTEGRATION-TEST] ✗ Subprocess error: ${err.message}`);
  process.exit(1);
});
