/**
 * WSL File Operation Tools
 * 
 * MCP tools for reading, writing, and managing files on WSL
 */

import { MCPTool } from './registry';
import { wslBridge, FileInfo } from '../utils/wslBridge';

/**
 * Read file from WSL
 */
export const readWslFile: MCPTool = {
  name: 'readWslFile',
  description: 'Read a file from WSL filesystem',
  parameters: {
    path: {
      type: 'string',
      description: 'File path in WSL (e.g., /home/user/file.txt)',
      required: true,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      const content = await wslBridge.readFile(params.path);
      return {
        success: true,
        path: params.path,
        content,
        size: content.length,
      };
    } catch (error: any) {
      return {
        success: false,
        path: params.path,
        error: error.message,
      };
    }
  },
};

/**
 * Write file to WSL
 */
export const writeWslFile: MCPTool = {
  name: 'writeWslFile',
  description: 'Write a file to WSL filesystem',
  parameters: {
    path: {
      type: 'string',
      description: 'File path in WSL (e.g., /home/user/file.txt)',
      required: true,
    },
    content: {
      type: 'string',
      description: 'File content to write',
      required: true,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      await wslBridge.writeFile(params.path, params.content);
      return {
        success: true,
        path: params.path,
        message: `File written successfully (${params.content.length} bytes)`,
      };
    } catch (error: any) {
      return {
        success: false,
        path: params.path,
        error: error.message,
      };
    }
  },
};

/**
 * List directory in WSL
 */
export const listWslDirectory: MCPTool = {
  name: 'listWslDirectory',
  description: 'List files in a WSL directory',
  parameters: {
    path: {
      type: 'string',
      description: 'Directory path in WSL (e.g., /home/user)',
      required: true,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      const files = await wslBridge.listDir(params.path);
      return {
        success: true,
        path: params.path,
        files: files.map((f: FileInfo) => ({
          name: f.name,
          path: f.path,
          isDirectory: f.isDirectory,
          size: f.size,
        })),
        count: files.length,
      };
    } catch (error: any) {
      return {
        success: false,
        path: params.path,
        error: error.message,
      };
    }
  },
};

/**
 * Delete file in WSL
 */
export const deleteWslFile: MCPTool = {
  name: 'deleteWslFile',
  description: 'Delete a file from WSL filesystem',
  parameters: {
    path: {
      type: 'string',
      description: 'File path in WSL (e.g., /home/user/file.txt)',
      required: true,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      await wslBridge.deleteFile(params.path);
      return {
        success: true,
        path: params.path,
        message: 'File deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        path: params.path,
        error: error.message,
      };
    }
  },
};

export const wslFileTools = {
  readWslFile,
  writeWslFile,
  listWslDirectory,
  deleteWslFile,
};
