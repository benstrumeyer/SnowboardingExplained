/**
 * WSL Service Management Tools
 * 
 * MCP tools for managing the pose service on WSL
 */

import { MCPTool } from './registry';
import { wslBridge } from '../utils/wslBridge';
import { wslConfig } from '../config/wsl.config';

/**
 * Start pose service on WSL
 */
export const startPoseService: MCPTool = {
  name: 'startPoseService',
  description: 'Start the pose service on WSL',
  parameters: {},
  handler: async () => {
    try {
      const pythonPath = wslConfig.python.pythonPath;
      const appPath = wslConfig.poseService.app;
      const command = `${pythonPath} ${appPath}`;

      // Run in background
      const result = await wslBridge.exec(
        `nohup ${command} > /tmp/pose-service.log 2>&1 &`,
        wslConfig.poseService.root
      );

      // Wait a bit for service to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if service is running
      const statusResult = await wslBridge.exec(
        `curl -s http://localhost:${wslConfig.poseService.port}/health`
      );

      if (statusResult.success && statusResult.stdout.includes('healthy')) {
        return {
          success: true,
          message: 'Pose service started successfully',
          port: wslConfig.poseService.port,
          url: `http://localhost:${wslConfig.poseService.port}`,
        };
      } else {
        return {
          success: false,
          message: 'Service started but health check failed',
          error: statusResult.stderr,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to start pose service',
        error: error.message,
      };
    }
  },
};

/**
 * Stop pose service on WSL
 */
export const stopPoseService: MCPTool = {
  name: 'stopPoseService',
  description: 'Stop the pose service on WSL',
  parameters: {},
  handler: async () => {
    try {
      // Kill process by port
      const result = await wslBridge.exec(
        `lsof -ti:${wslConfig.poseService.port} | xargs kill -9 2>/dev/null || true`
      );

      // Wait a bit for process to stop
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        message: 'Pose service stopped successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to stop pose service',
        error: error.message,
      };
    }
  },
};

/**
 * Get pose service status
 */
export const getPoseServiceStatus: MCPTool = {
  name: 'getPoseServiceStatus',
  description: 'Get the status of the pose service on WSL',
  parameters: {},
  handler: async () => {
    try {
      // Check if service is running
      const result = await wslBridge.exec(
        `curl -s http://localhost:${wslConfig.poseService.port}/health`
      );

      if (result.success && result.stdout.includes('healthy')) {
        return {
          success: true,
          status: 'running',
          healthy: true,
          port: wslConfig.poseService.port,
          url: `http://localhost:${wslConfig.poseService.port}`,
          message: 'Pose service is running and healthy',
        };
      } else {
        return {
          success: true,
          status: 'stopped',
          healthy: false,
          port: wslConfig.poseService.port,
          message: 'Pose service is not running',
        };
      }
    } catch (error: any) {
      return {
        success: true,
        status: 'stopped',
        healthy: false,
        port: wslConfig.poseService.port,
        message: 'Pose service is not running',
        error: error.message,
      };
    }
  },
};

/**
 * Get pose service logs
 */
export const getPoseServiceLogs: MCPTool = {
  name: 'getPoseServiceLogs',
  description: 'Get recent logs from the pose service',
  parameters: {
    lines: {
      type: 'number',
      description: 'Number of lines to return (default: 100)',
      required: false,
    },
  },
  handler: async (input: { lines?: number }) => {
    try {
      const numLines = input.lines || 100;
      const logPath = wslConfig.logs.poseServiceLog;

      // Try to read log file
      const result = await wslBridge.exec(`tail -n ${numLines} ${logPath}`);

      if (result.success) {
        return {
          success: true,
          logs: result.stdout,
          lines: result.stdout.split('\n').length,
        };
      } else {
        return {
          success: false,
          message: 'Log file not found or not accessible',
          error: result.stderr,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to get logs',
        error: error.message,
      };
    }
  },
};

/**
 * Restart pose service on WSL
 */
export const restartPoseService: MCPTool = {
  name: 'restartPoseService',
  description: 'Restart the pose service on WSL',
  parameters: {},
  handler: async () => {
    try {
      // Stop service
      await wslBridge.exec(
        `lsof -ti:${wslConfig.poseService.port} | xargs kill -9 2>/dev/null || true`
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start service
      const pythonPath = wslConfig.python.pythonPath;
      const appPath = wslConfig.poseService.app;
      const command = `${pythonPath} ${appPath}`;

      await wslBridge.exec(
        `nohup ${command} > /tmp/pose-service.log 2>&1 &`,
        wslConfig.poseService.root
      );

      // Wait for service to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if service is running
      const statusResult = await wslBridge.exec(
        `curl -s http://localhost:${wslConfig.poseService.port}/health`
      );

      if (statusResult.success && statusResult.stdout.includes('healthy')) {
        return {
          success: true,
          message: 'Pose service restarted successfully',
          port: wslConfig.poseService.port,
          url: `http://localhost:${wslConfig.poseService.port}`,
        };
      } else {
        return {
          success: false,
          message: 'Service restarted but health check failed',
          error: statusResult.stderr,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to restart pose service',
        error: error.message,
      };
    }
  },
};

export const wslServiceTools = {
  startPoseService,
  stopPoseService,
  getPoseServiceStatus,
  getPoseServiceLogs,
  restartPoseService,
};
