/**
 * WSL Command Execution Tools
 * 
 * MCP tools for running commands and Python scripts on WSL
 */

import { MCPTool } from './registry';
import { wslBridge } from '../utils/wslBridge';
import { wslConfig } from '../config/wsl.config';

// Dangerous commands that should be blocked
const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'dd if=/dev/zero',
  'mkfs',
  'fdisk',
  'shutdown',
  'reboot',
  'halt',
];

/**
 * Check if command is dangerous
 */
function isDangerousCommand(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return DANGEROUS_COMMANDS.some((dangerous) =>
    lowerCommand.includes(dangerous.toLowerCase())
  );
}

/**
 * Run command in WSL
 */
export const runWslCommand: MCPTool = {
  name: 'runWslCommand',
  description: 'Run a command in WSL',
  parameters: {
    command: {
      type: 'string',
      description: 'Command to run (e.g., ls -la /home/user)',
      required: true,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (optional, e.g., /home/user/pose-service)',
      required: false,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      // Check for dangerous commands
      if (isDangerousCommand(params.command)) {
        return {
          success: false,
          command: params.command,
          error: 'Command is blocked for safety reasons',
          exitCode: 403,
        };
      }

      const result = await wslBridge.exec(params.command, params.cwd);

      return {
        success: result.success,
        command: params.command,
        cwd: params.cwd,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        command: params.command,
        error: error.message,
        exitCode: 1,
      };
    }
  },
};

/**
 * Run Python script in WSL venv
 */
export const runWslPython: MCPTool = {
  name: 'runWslPython',
  description: 'Run a Python script in WSL venv',
  parameters: {
    script: {
      type: 'string',
      description: 'Python script path (e.g., /home/user/pose-service/test.py)',
      required: true,
    },
    args: {
      type: 'array',
      description: 'Script arguments (optional)',
      required: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (optional)',
      required: false,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      const pythonPath = wslConfig.python.pythonPath;
      const argsStr = (params.args || []).map((arg: string) => `"${arg}"`).join(' ');
      const command = `${pythonPath} ${params.script} ${argsStr}`.trim();

      const result = await wslBridge.exec(command, params.cwd);

      return {
        success: result.success,
        script: params.script,
        args: params.args,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        script: params.script,
        error: error.message,
        exitCode: 1,
      };
    }
  },
};

/**
 * Install Python package in WSL venv
 */
export const installWslPackage: MCPTool = {
  name: 'installWslPackage',
  description: 'Install a Python package in WSL venv',
  parameters: {
    package: {
      type: 'string',
      description: 'Package name or requirement (e.g., numpy, torch==1.9.0)',
      required: true,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      const pipPath = wslConfig.python.pipPath;
      const command = `${pipPath} install ${params.package}`;

      const result = await wslBridge.exec(command);

      return {
        success: result.success,
        package: params.package,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        package: params.package,
        error: error.message,
        exitCode: 1,
      };
    }
  },
};

/**
 * Get Python version in WSL venv
 */
export const getWslPythonVersion: MCPTool = {
  name: 'getWslPythonVersion',
  description: 'Get Python version in WSL venv',
  parameters: {},
  handler: async () => {
    try {
      const pythonPath = wslConfig.python.pythonPath;
      const command = `${pythonPath} --version`;

      const result = await wslBridge.exec(command);

      return {
        success: result.success,
        version: result.stdout.trim() || result.stderr.trim(),
        exitCode: result.exitCode,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        exitCode: 1,
      };
    }
  },
};

export const wslCommandTools = {
  runWslCommand,
  runWslPython,
  installWslPackage,
  getWslPythonVersion,
};
