const { spawn } = require('child_process');
const path = require('path');

const pklPath = '/tmp/video_processing/results.pkl';
const pythonScriptPath = path.join(__dirname, 'src/services/pickle_parser.py');
const pythonPath = path.join(__dirname, 'pose-service/venv/bin/python');

console.log(`[TEST] Testing pickle parser`);
console.log(`[TEST] PKL file: ${pklPath}`);
console.log(`[TEST] Python script: ${pythonScriptPath}`);
console.log(`[TEST] Python: ${pythonPath}`);
console.log(`[TEST] ========================================`);

const subprocess = spawn(pythonPath, [pythonScriptPath, pklPath], {
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 60000,
});

let stdout = '';
let stderr = '';

subprocess.stdout?.on('data', (data) => {
  const chunk = data.toString();
  stdout += chunk;
  console.log(`[STDOUT] ${chunk}`);
});

subprocess.stderr?.on('data', (data) => {
  const chunk = data.toString();
  stderr += chunk;
  console.log(`[STDERR] ${chunk}`);
});

subprocess.on('close', (exitCode) => {
  console.log(`[TEST] ========================================`);
  console.log(`[TEST] Exit code: ${exitCode}`);

  if (exitCode === 0) {
    try {
      const result = JSON.parse(stdout);
      console.log(`[TEST] ✓ Successfully parsed JSON`);
      console.log(`[TEST] Frame count: ${result.frameCount}`);
      console.log(`[TEST] Frames: ${result.frames.length}`);
      if (result.frames.length > 0) {
        console.log(`[TEST] First frame:`, JSON.stringify(result.frames[0], null, 2).substring(0, 500));
      }
    } catch (e) {
      console.log(`[TEST] ✗ Failed to parse JSON: ${e.message}`);
      console.log(`[TEST] Stdout length: ${stdout.length}`);
    }
  } else {
    console.log(`[TEST] ✗ Process exited with code ${exitCode}`);
  }
});

subprocess.on('error', (err) => {
  console.log(`[TEST] ✗ Subprocess error: ${err.message}`);
});
