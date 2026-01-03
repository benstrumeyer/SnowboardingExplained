import { spawn } from 'child_process';
import * as path from 'path';

export interface FrameData {
  frameNumber: number;
  timestamp: number;
  persons: PersonData[];
}

export interface PersonData {
  personId: number;
  confidence: number;
  tracked: boolean;
  meshVertices?: number[][];
  meshVertexCount?: number;
  meshFaces?: number[][];
  meshFaceCount?: number;
  camera?: {
    tx: number;
    ty: number;
    tz: number;
    focalLength: number;
  };
}

export interface ParsedPickleResult {
  success: boolean;
  frames?: FrameData[];
  frameCount?: number;
  error?: string;
  stderr?: string;
  processingTimeMs?: number;
}

export async function parsePickleToFrames(
  pklPath: string,
  timeout: number = 60000
): Promise<ParsedPickleResult> {
  const startTime = Date.now();
  console.log(`[PICKLE_PARSER] 🚀 Starting pickle parser for pklPath=${pklPath}`);
  console.log(`[PICKLE_PARSER] Timeout: ${timeout}ms`);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      const pythonScriptPath = path.join(__dirname, 'pickle_parser.py');
      console.log(`[PICKLE_PARSER] Python script: ${pythonScriptPath}`);

      const subprocess = spawn('python3', [pythonScriptPath, pklPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeout,
      });

      console.log(`[PICKLE_PARSER] ✓ Subprocess spawned with PID=${subprocess.pid}`);

      subprocess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[PICKLE_PARSER] [stdout] ${chunk.trim().substring(0, 200)}`);
      });

      subprocess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[PICKLE_PARSER] [stderr] ${chunk.trim()}`);
      });

      timeoutHandle = setTimeout(() => {
        console.log(`[PICKLE_PARSER] ✗ Timeout after ${timeout}ms, killing subprocess`);
        subprocess.kill('SIGTERM');
        resolve({
          success: false,
          error: `Parsing timeout after ${timeout}ms`,
          stderr,
          processingTimeMs: Date.now() - startTime,
        });
      }, timeout);

      subprocess.on('close', (exitCode) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);

        const processingTimeMs = Date.now() - startTime;
        console.log(`[PICKLE_PARSER] ✓ Subprocess completed with exitCode=${exitCode} in ${processingTimeMs}ms`);

        if (exitCode !== 0) {
          console.log(`[PICKLE_PARSER] ✗ Non-zero exit code: ${exitCode}`);
          resolve({
            success: false,
            error: `pickle_parser.py exited with code ${exitCode}`,
            stderr,
            processingTimeMs,
          });
          return;
        }

        // Parse JSON output
        try {
          console.log(`[PICKLE_PARSER] Parsing JSON output...`);
          const result = JSON.parse(stdout);

          console.log(`[PICKLE_PARSER] ✓ Parsed ${result.frameCount} frames`);

          resolve({
            success: true,
            frames: result.frames,
            frameCount: result.frameCount,
            processingTimeMs,
          });
        } catch (parseErr: any) {
          console.log(`[PICKLE_PARSER] ✗ JSON parse error: ${parseErr.message}`);
          resolve({
            success: false,
            error: `Failed to parse JSON output: ${parseErr.message}`,
            stderr,
            processingTimeMs,
          });
        }
      });

      subprocess.on('error', (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        console.log(`[PICKLE_PARSER] ✗ Subprocess error: ${err.message}`);
        resolve({
          success: false,
          error: `Subprocess error: ${err.message}`,
          stderr,
          processingTimeMs: Date.now() - startTime,
        });
      });
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.log(`[PICKLE_PARSER] ✗ Exception: ${err.message}`);
      resolve({
        success: false,
        error: `Exception: ${err.message}`,
        stderr,
        processingTimeMs: Date.now() - startTime,
      });
    }
  });
}
