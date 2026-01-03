import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface VideoProcessingResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  pklPath?: string;
  overlayVideoPath?: string;
  error?: string;
  processingTimeMs?: number;
}

export async function processVideoWithTrackPy(
  videoPath: string,
  timeout: number = 3600000
): Promise<VideoProcessingResult> {
  const startTime = Date.now();
  console.log(`[SUBPROCESS] 🚀 Starting track.py subprocess for videoPath=${videoPath}`);
  console.log(`[SUBPROCESS] Working directory: /home/ben/repos/4D-Humans`);
  console.log(`[SUBPROCESS] Timeout: ${timeout}ms`);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const outputDir = path.join(path.dirname(videoPath), 'track_output');
      fs.mkdirSync(outputDir, { recursive: true });

      const pythonPath = '/home/ben/repos/SnowboardingExplained/backend/pose-service/venv/bin/python';
      const trackPyPath = '/home/ben/repos/4D-Humans/track.py';

      // Build command with proper quoting for bash -c
      const bashCmd = `"${pythonPath}" "${trackPyPath}" video.source="${videoPath}" video.output_dir="${outputDir}" phalp.end_frame=999999 hydra.run.dir=. hydra.output_subdir=null`;

      console.log(`[SUBPROCESS] Command: ${bashCmd}`);

      const subprocess = spawn('bash', ['-c', bashCmd], {
        cwd: '/home/ben/repos/4D-Humans',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      console.log(`[SUBPROCESS] ✓ Subprocess spawned with PID=${subprocess.pid}`);

      subprocess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[SUBPROCESS] [stdout] ${chunk.trim()}`);
      });

      subprocess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[SUBPROCESS] [stderr] ${chunk.trim()}`);
      });

      timeoutHandle = setTimeout(() => {
        console.log(`[SUBPROCESS] ✗ Timeout after ${timeout}ms, killing subprocess`);
        subprocess.kill('SIGTERM');
        resolve({
          success: false,
          exitCode: null,
          stdout,
          stderr,
          error: `Processing timeout after ${timeout}ms`,
          processingTimeMs: Date.now() - startTime,
        });
      }, timeout);

      subprocess.on('close', (exitCode) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);

        const processingTimeMs = Date.now() - startTime;
        console.log(`[SUBPROCESS] ✓ Subprocess completed with exitCode=${exitCode} in ${processingTimeMs}ms`);
        console.log(`[SUBPROCESS] stdout length: ${stdout.length} bytes`);
        console.log(`[SUBPROCESS] stderr length: ${stderr.length} bytes`);

        if (exitCode !== 0) {
          console.log(`[SUBPROCESS] ✗ Non-zero exit code: ${exitCode}`);
          console.log(`[SUBPROCESS] Last 500 chars of stdout: ${stdout.slice(-500)}`);
          console.log(`[SUBPROCESS] Last 500 chars of stderr: ${stderr.slice(-500)}`);
          resolve({
            success: false,
            exitCode,
            stdout,
            stderr,
            error: `track.py exited with code ${exitCode}`,
            processingTimeMs,
          });
          return;
        }

        // Find pickle file in output directory
        const outputDir = path.join(path.dirname(videoPath), 'track_output');
        console.log(`[PICKLE_DETECT] 🔍 Searching for .pkl file in ${outputDir}`);
        const pklPattern = `${outputDir}/**/*.pkl`;
        glob.glob(pklPattern, (err, files) => {
          if (err) {
            console.log(`[PICKLE_DETECT] ✗ Glob error: ${err.message}`);
            resolve({
              success: false,
              exitCode: 0,
              stdout,
              stderr,
              error: `Failed to search for pickle file: ${err.message}`,
              processingTimeMs,
            });
            return;
          }

          console.log(`[PICKLE_DETECT] Found ${files.length} .pkl files`);
          if (files.length === 0) {
            console.log(`[PICKLE_DETECT] ✗ No pickle file found in ${outputDir}`);
            resolve({
              success: false,
              exitCode: 0,
              stdout,
              stderr,
              error: `No pickle file found in ${outputDir}`,
              processingTimeMs,
            });
            return;
          }

          const pklPath = files[0];
          console.log(`[PICKLE_DETECT] ✓ Found pickle file: ${pklPath}`);

          // Find overlay video
          console.log(`[VIDEO_DETECT] 🔍 Searching for overlay video in ${outputDir}`);
          const videoPattern = `${outputDir}/**/*.mp4`;
          glob.glob(videoPattern, (err, videoFiles) => {
            let overlayVideoPath: string | undefined;

            if (!err && videoFiles.length > 0) {
              overlayVideoPath = videoFiles[0];
              console.log(`[VIDEO_DETECT] ✓ Found overlay video: ${overlayVideoPath}`);
            } else {
              console.log(`[VIDEO_DETECT] ⚠ No overlay video found`);
            }

            resolve({
              success: true,
              exitCode: 0,
              stdout,
              stderr,
              pklPath,
              overlayVideoPath,
              processingTimeMs,
            });
          });
        });
      });

      subprocess.on('error', (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        console.log(`[SUBPROCESS] ✗ Subprocess error: ${err.message}`);
        resolve({
          success: false,
          exitCode: null,
          stdout,
          stderr,
          error: `Subprocess error: ${err.message}`,
          processingTimeMs: Date.now() - startTime,
        });
      });
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.log(`[SUBPROCESS] ✗ Exception: ${err.message}`);
      resolve({
        success: false,
        exitCode: null,
        stdout,
        stderr,
        error: `Exception: ${err.message}`,
        processingTimeMs: Date.now() - startTime,
      });
    }
  });
}
