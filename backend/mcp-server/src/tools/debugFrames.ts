/**
 * Debug Frames Tool for React Native
 * 
 * Captures frames from the mobile app and stores them for visual debugging
 * Similar to Playwright's visual debugging for web
 */

import { MCPTool } from './registry';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_FRAMES_DIR = path.join(process.cwd(), '.debug-frames');

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_FRAMES_DIR)) {
  fs.mkdirSync(DEBUG_FRAMES_DIR, { recursive: true });
}

/**
 * Save a frame for debugging
 */
export const saveDebugFrame: MCPTool = {
  name: 'saveDebugFrame',
  description: 'Save a frame from the mobile app for visual debugging',
  parameters: {
    frameData: {
      type: 'string',
      description: 'Base64 encoded frame image',
      required: true,
    },
    frameNumber: {
      type: 'number',
      description: 'Frame number for identification',
      required: true,
    },
    metadata: {
      type: 'object',
      description: 'Additional metadata about the frame',
      required: false,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      const { frameData, frameNumber, metadata } = params;
      
      // Create frame directory
      const frameDir = path.join(DEBUG_FRAMES_DIR, `frame-${frameNumber}`);
      if (!fs.existsSync(frameDir)) {
        fs.mkdirSync(frameDir, { recursive: true });
      }

      // Save image
      const imagePath = path.join(frameDir, 'frame.png');
      const buffer = Buffer.from(frameData, 'base64');
      fs.writeFileSync(imagePath, buffer);

      // Save metadata
      if (metadata) {
        const metadataPath = path.join(frameDir, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }

      return {
        success: true,
        message: `Frame ${frameNumber} saved`,
        path: frameDir,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * Get list of saved debug frames
 */
export const listDebugFrames: MCPTool = {
  name: 'listDebugFrames',
  description: 'List all saved debug frames',
  parameters: {},
  handler: async () => {
    try {
      if (!fs.existsSync(DEBUG_FRAMES_DIR)) {
        return {
          success: true,
          frames: [],
          message: 'No debug frames saved yet',
        };
      }

      const frames = fs.readdirSync(DEBUG_FRAMES_DIR)
        .filter(f => f.startsWith('frame-'))
        .map(f => {
          const frameNum = parseInt(f.replace('frame-', ''));
          const framePath = path.join(DEBUG_FRAMES_DIR, f);
          const hasImage = fs.existsSync(path.join(framePath, 'frame.png'));
          const hasMetadata = fs.existsSync(path.join(framePath, 'metadata.json'));
          
          let metadata = null;
          if (hasMetadata) {
            const metadataContent = fs.readFileSync(path.join(framePath, 'metadata.json'), 'utf-8');
            metadata = JSON.parse(metadataContent);
          }

          return {
            frameNumber: frameNum,
            hasImage,
            hasMetadata,
            metadata,
            path: framePath,
          };
        })
        .sort((a, b) => a.frameNumber - b.frameNumber);

      return {
        success: true,
        frames,
        count: frames.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * Get a specific debug frame
 */
export const getDebugFrame: MCPTool = {
  name: 'getDebugFrame',
  description: 'Get a specific debug frame with metadata',
  parameters: {
    frameNumber: {
      type: 'number',
      description: 'Frame number to retrieve',
      required: true,
    },
  },
  handler: async (params: Record<string, any>) => {
    try {
      const { frameNumber } = params;
      const frameDir = path.join(DEBUG_FRAMES_DIR, `frame-${frameNumber}`);

      if (!fs.existsSync(frameDir)) {
        return {
          success: false,
          error: `Frame ${frameNumber} not found`,
        };
      }

      const imagePath = path.join(frameDir, 'frame.png');
      const metadataPath = path.join(frameDir, 'metadata.json');

      let imageBase64 = null;
      let metadata = null;

      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        imageBase64 = imageBuffer.toString('base64');
      }

      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      }

      return {
        success: true,
        frameNumber,
        image: imageBase64,
        metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

/**
 * Clear all debug frames
 */
export const clearDebugFrames: MCPTool = {
  name: 'clearDebugFrames',
  description: 'Clear all saved debug frames',
  parameters: {},
  handler: async () => {
    try {
      if (fs.existsSync(DEBUG_FRAMES_DIR)) {
        fs.rmSync(DEBUG_FRAMES_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(DEBUG_FRAMES_DIR, { recursive: true });

      return {
        success: true,
        message: 'All debug frames cleared',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export const debugFrameTools = {
  saveDebugFrame,
  listDebugFrames,
  getDebugFrame,
  clearDebugFrames,
};
