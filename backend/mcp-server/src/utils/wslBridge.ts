/**
 * WSL Bridge - Communicates with WSL via wsl.exe command
 * 
 * Enables file access and command execution on WSL from Windows
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}

/**
 * WSL Bridge - Communicates with WSL filesystem and commands
 */
export class WslBridge {
  private wslDistro = 'Ubuntu';
  private timeout = 30000; // 30 seconds

  /**
   * Execute command in WSL
   * @param command Command to execute
   * @param cwd Working directory (optional)
   * @returns Execution result with exit code, stdout, stderr
   */
  async exec(command: string, cwd?: string): Promise<ExecResult> {
    try {
      const fullCommand = cwd
        ? `wsl -d ${this.wslDistro} -e bash -c "cd ${cwd} && ${command}"`
        : `wsl -d ${this.wslDistro} -e bash -c "${command}"`;

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        exitCode: 0,
        stdout,
        stderr,
        success: true,
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || 'Unknown error',
        success: false,
      };
    }
  }

  /**
   * Read file from WSL
   * @param filePath File path in WSL
   * @returns File content
   */
  async readFile(filePath: string): Promise<string> {
    if (!filePath) {
      throw new Error('File path is required');
    }

    const result = await this.exec(`cat "${filePath}"`);
    if (!result.success) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }
    return result.stdout;
  }

  /**
   * Write file to WSL
   * @param filePath File path in WSL
   * @param content File content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!filePath) {
      throw new Error('File path is required');
    }

    // Use heredoc to write file safely
    const command = `cat > "${filePath}" << 'EOF'\n${content}\nEOF`;
    const result = await this.exec(command);
    if (!result.success) {
      throw new Error(`Failed to write file: ${result.stderr}`);
    }
  }

  /**
   * List directory in WSL
   * @param dirPath Directory path in WSL
   * @returns Array of file info
   */
  async listDir(dirPath: string): Promise<FileInfo[]> {
    if (!dirPath) {
      throw new Error('Directory path is required');
    }

    // Use ls -la to get detailed file info
    const result = await this.exec(`ls -la "${dirPath}"`);
    if (!result.success) {
      throw new Error(`Failed to list directory: ${result.stderr}`);
    }

    const files: FileInfo[] = [];
    const lines = result.stdout.split('\n').slice(1); // Skip header

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const isDirectory = parts[0].startsWith('d');
      const size = parseInt(parts[4], 10);
      const name = parts.slice(8).join(' ');

      files.push({
        name,
        path: `${dirPath}/${name}`,
        isDirectory,
        size,
        modified: new Date(),
      });
    }

    return files;
  }

  /**
   * Delete file in WSL
   * @param filePath File path in WSL
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) {
      throw new Error('File path is required');
    }

    // Prevent dangerous operations
    if (filePath === '/' || filePath === '/home' || filePath === '/usr') {
      throw new Error('Cannot delete system directories');
    }

    const result = await this.exec(`rm "${filePath}"`);
    if (!result.success) {
      throw new Error(`Failed to delete file: ${result.stderr}`);
    }
  }

  /**
   * Convert Windows path to WSL path
   * @param windowsPath Windows path (e.g., C:\Users\user\repo)
   * @returns WSL path (e.g., /mnt/c/Users/user/repo)
   */
  toWslPath(windowsPath: string): string {
    return windowsPath
      .replace(/\\/g, '/')
      .replace(/^([A-Z]):/, (match, drive) => `/mnt/${drive.toLowerCase()}`);
  }

  /**
   * Convert WSL path to Windows path
   * @param wslPath WSL path (e.g., /mnt/c/Users/user/repo)
   * @returns Windows path (e.g., C:\Users\user\repo)
   */
  toWindowsPath(wslPath: string): string {
    return wslPath
      .replace(/^\/mnt\/([a-z])\//, (match, drive) => `${drive.toUpperCase()}:\\`)
      .replace(/\//g, '\\');
  }

  /**
   * Check if WSL is available
   * @returns True if WSL is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.exec('echo "WSL available"');
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get WSL version info
   * @returns Version info
   */
  async getVersion(): Promise<string> {
    try {
      const result = await this.exec('uname -a');
      return result.stdout;
    } catch {
      return 'Unknown';
    }
  }
}

// Export singleton instance
export const wslBridge = new WslBridge();
