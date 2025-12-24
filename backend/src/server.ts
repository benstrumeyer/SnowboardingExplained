import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import FormData from 'form-data';
import axios from 'axios';
import logger from './logger';
import { FrameExtractionService } from './services/frameExtraction';
import { VideoExtractionService } from './services/videoExtractionService';
import { TrickDetectionService } from './services/trickDetection';
import { LLMTrickDetectionService } from './services/llmTrickDetection';
import { ChatService } from './services/chatService';
import { KnowledgeBaseService } from './services/knowledgeBase';
import { meshDataService } from './services/meshDataService';
import { initializeRedisCache } from './services/redisCacheService';
import { ApiResponse } from './types';
import { connectDB } from '../mcp-server/src/db/connection';
import { processVideoUpload, getVideoAnalysis } from './services/videoAnalysisPipelineImpl';
// New imports for Python pose service
import { detectPose, detectPoseParallel, detectPoseHybrid, detectPoseHybridBatch, checkPoseServiceHealth, PoseFrame, HybridPoseFrame } from './services/pythonPoseService';
import { AnalysisLogBuilder, analyzeFrame, AnalysisLog, FrameAnalysis } from './services/analysisLogService';
import { initializeFrameDataService } from './services/frameDataService';
// Process pool imports
import { ProcessPoolManager } from './services/processPoolManager';
import { loadPosePoolConfig } from './services/posePoolConfig';
import { createPoseRouter } from './api/pose';
// API routes
import perfectPhasesRouter from '../api/perfect-phases';
import comparisonRouter from '../api/comparison';
import stackedPositionRouter from '../api/stacked-position';
import referenceLibraryRouter from '../api/reference-library';
import frameDataRouter from '../api/frame-data';
import smoothingControlRouter from '../api/smoothing-control';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
console.log(`[STARTUP] Loading env from: ${envPath}`);
console.log(`[STARTUP] Env file exists: ${fs.existsSync(envPath)}`);
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.warn(`[STARTUP] Warning loading .env.local: ${envResult.error.message}`);
} else {
  console.log(`[STARTUP] ✓ Loaded .env.local successfully`);
}
// Also load from .env as fallback
dotenv.config();

// Log critical environment variables
console.log(`[STARTUP] POSE_SERVICE_URL: ${process.env.POSE_SERVICE_URL || 'NOT SET (will use http://localhost:5000)'}`);
console.log(`[STARTUP] POSE_SERVICE_TIMEOUT: ${process.env.POSE_SERVICE_TIMEOUT || 'NOT SET (will use 10000ms)'}`);
console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`[STARTUP] PORT: ${process.env.PORT || '3001'}`);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration for ngrok tunnel and local development
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '';
  
  // Allow ngrok tunnel, localhost, and local IPs
  const allowedOrigins = [
    'https://uncongenial-nonobstetrically-norene.ngrok-free.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8081',
    /^http:\/\/192\.168\./,
    /^http:\/\/127\./,
  ];
  
  const isAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    }
    return allowed.test(origin);
  });
  
  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Configure multer for video uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, and WebM are allowed.'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB - supports high-quality 60 FPS videos
});

// 4D-Humans SMPL skeleton connections (24 joints)
const SMPL_SKELETON_CONNECTIONS: [string, string][] = [
  // Spine
  ['pelvis', 'spine1'], ['spine1', 'spine2'], ['spine2', 'spine3'], ['spine3', 'neck'], ['neck', 'head'],
  // Left arm
  ['spine3', 'left_collar'], ['left_collar', 'left_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'], ['left_wrist', 'left_hand'],
  // Right arm
  ['spine3', 'right_collar'], ['right_collar', 'right_shoulder'], ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'], ['right_wrist', 'right_hand'],
  // Left leg
  ['pelvis', 'left_hip'], ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'], ['left_ankle', 'left_foot'],
  // Right leg
  ['pelvis', 'right_hip'], ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'], ['right_ankle', 'right_foot'],
];

import sharp from 'sharp';

async function visualize4DHumansSkeleton(
  imageBase64: string,
  poseData: HybridPoseFrame,
  frameIndex: number,
  totalFrames: number
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 640;
  const height = metadata.height || 480;
  
  // Build keypoint lookup - keypoints are now in pixel coordinates from Python
  const kpMap = new Map<string, { x: number; y: number; z?: number }>();
  for (const kp of poseData.keypoints) {
    // x, y are already in pixel coordinates from the Python service
    kpMap.set(kp.name, { x: kp.x, y: kp.y, z: kp.z });
  }
  
  // Generate SVG
  const lines: string[] = [];
  const circles: string[] = [];
  
  for (const [startName, endName] of SMPL_SKELETON_CONNECTIONS) {
    const start = kpMap.get(startName);
    const end = kpMap.get(endName);
    if (start && end) {
      // Bright orange/yellow color for visibility
      lines.push(
        `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#FF6600" stroke-width="3" stroke-linecap="round"/>`
      );
    }
  }
  
  // Draw joints - small circles
  for (const [name, pos] of kpMap) {
    circles.push(
      `<circle cx="${pos.x}" cy="${pos.y}" r="5" fill="#FFFF00" stroke="#FF6600" stroke-width="2"/>`
    );
  }
  
  // Info overlay
  const infoSvg = `
    <rect x="10" y="10" width="280" height="70" fill="rgba(0,0,0,0.8)" rx="8"/>
    <text x="20" y="35" fill="#9C27B0" font-size="16" font-family="Arial" font-weight="bold">4D-Humans HMR2</text>
    <text x="20" y="55" fill="white" font-size="14" font-family="Arial">Frame ${frameIndex + 1}/${totalFrames} • ${poseData.keypointCount} joints</text>
    <text x="20" y="72" fill="#888" font-size="11" font-family="Arial">3D: ${poseData.has3d ? 'YES' : 'NO'} • ${poseData.processingTimeMs}ms</text>
  `;
  
  // Joint angles if available
  let anglesSvg = '';
  if (poseData.jointAngles3d) {
    const angles = poseData.jointAngles3d;
    anglesSvg = `
      <rect x="${width - 160}" y="10" width="150" height="100" fill="rgba(0,0,0,0.8)" rx="8"/>
      <text x="${width - 150}" y="30" fill="#00BFFF" font-size="12" font-family="Arial" font-weight="bold">Joint Angles</text>
      <text x="${width - 150}" y="48" fill="white" font-size="11" font-family="Arial">L Knee: ${angles.left_knee?.toFixed(0) || '?'}°</text>
      <text x="${width - 150}" y="63" fill="white" font-size="11" font-family="Arial">R Knee: ${angles.right_knee?.toFixed(0) || '?'}°</text>
      <text x="${width - 150}" y="78" fill="white" font-size="11" font-family="Arial">L Hip: ${angles.left_hip?.toFixed(0) || '?'}°</text>
      <text x="${width - 150}" y="93" fill="white" font-size="11" font-family="Arial">R Hip: ${angles.right_hip?.toFixed(0) || '?'}°</text>
      <text x="${width - 150}" y="108" fill="white" font-size="11" font-family="Arial">Spine: ${angles.spine?.toFixed(0) || '?'}°</text>
    `;
  }
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${lines.join('\n')}
      ${circles.join('\n')}
      ${infoSvg}
      ${anglesSvg}
    </svg>
  `;
  
  const result = await sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
  
  return result.toString('base64');
}

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { error: err });
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  } as ApiResponse<null>);
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  logger.info('Health check requested');
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    timestamp: new Date().toISOString()
  } as ApiResponse<any>);
});

// Video serving endpoint - serves uploaded videos with proper CORS headers
app.get('/videos/:videoId', (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    // Ensure CORS headers are set for video responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    // Look for the video file in the uploads directory
    // Try with common video extensions
    const extensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    let videoPath: string | null = null;
    
    for (const ext of extensions) {
      const testPath = path.join(uploadDir, videoId + ext);
      if (fs.existsSync(testPath)) {
        videoPath = testPath;
        break;
      }
    }
    
    // Also try without extension (for backward compatibility)
    if (!videoPath) {
      const testPath = path.join(uploadDir, videoId);
      if (fs.existsSync(testPath)) {
        videoPath = testPath;
      }
    }
    
    // Check if file exists
    if (!videoPath) {
      logger.warn(`Video not found: ${videoId}`);
      return res.status(404).json({
        success: false,
        error: `Video not found: ${videoId}`,
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }
    
    // Get file stats
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;
    
    // Set proper headers for video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);
      
      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);
    } else {
      const stream = fs.createReadStream(videoPath);
      stream.pipe(res);
    }
    
    logger.info(`Video served: ${videoId}`, { fileSize });
  } catch (error: any) {
    logger.error(`Error serving video: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      error: 'Failed to serve video',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Global process pool manager instance
let poolManager: ProcessPoolManager | null = null;

// Mount API routes
app.use('/api/perfect-phases', perfectPhasesRouter);
app.use('/api', comparisonRouter);
app.use('/api', stackedPositionRouter);
app.use('/api', referenceLibraryRouter);
app.use('/api', frameDataRouter);
app.use('/api', smoothingControlRouter);

// Mount pose detection endpoints (requires pool manager)
if (poolManager) {
  app.use('/api/pose', createPoseRouter(poolManager));
}

// Chunked Video Upload Endpoints
const chunksDir = path.join(os.tmpdir(), 'video-chunks');
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

const chunkStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, chunksDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    // Use a simple timestamp-based filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    cb(null, `chunk-${timestamp}-${random}`);
  },
});

const chunkUpload = multer({ 
  storage: chunkStorage
});

app.post('/api/upload-chunk', chunkUpload.single('chunk'), (req: Request, res: Response) => {
  try {
    const { sessionId, chunkIndex, totalChunks } = req.body;

    if (!sessionId || chunkIndex === undefined || !totalChunks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No chunk file provided' });
    }

    // Rename the file to include sessionId and chunkIndex
    const oldPath = req.file.path;
    const newPath = path.join(chunksDir, `${sessionId}-chunk-${chunkIndex}`);
    fs.renameSync(oldPath, newPath);

    logger.info(`Chunk uploaded: ${sessionId}-chunk-${chunkIndex}`, {
      sessionId,
      chunkIndex,
      totalChunks,
      fileSize: req.file.size,
      filename: req.file.filename
    });

    res.status(200).json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      totalChunks: parseInt(totalChunks),
    });
  } catch (error) {
    logger.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/finalize-upload', express.json(), async (req: Request, res: Response) => {
  try {
    const { role, sessionId, filename, filesize } = req.body;

    if (!role || !sessionId) {
      return res.status(400).json({ error: 'Missing role or sessionId' });
    }

    // Generate video ID
    const videoId = generateVideoId();
    
    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] Generated videoId: ${videoId}`);
    console.log(`[FINALIZE] Role: ${role}`);
    console.log(`[FINALIZE] SessionId: ${sessionId}`);
    console.log(`[FINALIZE] Filename: ${filename}`);
    console.log(`[FINALIZE] Filesize: ${filesize} bytes`);

    // Assemble chunks into final video file
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (must match frontend)
    const totalChunks = Math.ceil(filesize / CHUNK_SIZE);
    
    console.log(`[FINALIZE] Assembling ${totalChunks} chunks...`);

    // Create output file path
    const ext = path.extname(filename) || '.mp4';
    const videoPath = path.join(uploadDir, videoId + ext);
    const writeStream = fs.createWriteStream(videoPath);

    let assembledSize = 0;

    // Assemble chunks in order
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, `${sessionId}-chunk-${i}`);
      
      if (!fs.existsSync(chunkPath)) {
        console.error(`[FINALIZE] ✗ Missing chunk ${i}: ${chunkPath}`);
        return res.status(400).json({ 
          error: `Missing chunk ${i}/${totalChunks}. Upload may have been interrupted.` 
        });
      }

      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
      assembledSize += chunkData.length;
      
      console.log(`[FINALIZE] ✓ Assembled chunk ${i + 1}/${totalChunks} (${chunkData.length} bytes)`);
      
      // Delete chunk after assembly
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    // Wait for write to complete
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    console.log(`[FINALIZE] ✓ Video assembled: ${videoPath} (${assembledSize} bytes)`);
    
    logger.info(`Video uploaded and ready for pose extraction: ${videoId}`, {
      role,
      videoPath,
      filename,
      filesize,
      assembledSize,
      chunksAssembled: totalChunks
    });

    // Trigger pose extraction asynchronously
    (async () => {
      try {
        logger.info(`Starting mesh-aligned frame extraction for ${videoId}`);
        
        // Extract frames aligned with mesh indices
        const extractionResult = await VideoExtractionService.extractFramesAtMeshIndices(videoPath, videoId);
        logger.info(`Mesh-aligned frame extraction completed for ${videoId}`, {
          extractedFrames: extractionResult.extractedFrames,
          meshAligned: extractionResult.meshAligned
        });

        // Get pose data for each frame from the pose service
        const poseFrames: any[] = [];
        const cachedFrames = FrameExtractionService.getCachedFrames(videoId);
        
        if (cachedFrames) {
          for (let i = 0; i < cachedFrames.frameCount; i++) {
            const frame = cachedFrames.frames[i];
            if (frame) {
              try {
                const imageBase64 = FrameExtractionService.getFrameAsBase64(frame.imagePath);
                const poseResult = await detectPoseHybrid(imageBase64);
                poseFrames.push({
                  frameNumber: i,
                  timestamp: frame.timestamp,
                  pose: poseResult
                });
              } catch (err) {
                logger.warn(`Failed to extract pose for frame ${i}:`, err);
              }
            }
          }
        }

        logger.info(`Pose extraction complete for ${videoId}: ${poseFrames.length} frames with pose data`);
      } catch (err) {
        logger.error(`Mesh-aligned frame extraction failed for ${videoId}:`, err);
      }
    })();

    res.status(200).json({
      success: true,
      videoId,
      role,
      message: 'Video uploaded. Pose extraction started in background.'
    });
  } catch (error) {
    logger.error('Finalize upload error:', error);
    res.status(500).json({ error: 'Failed to finalize upload' });
  }
});

// Simple ID generator for video uploads
let videoIdCounter = 0;
function generateVideoId(): string {
  videoIdCounter++;
  return `v_${Date.now()}_${videoIdCounter}`;
}

// Alternative endpoint for direct video upload with pose extraction
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  const videoId = generateVideoId();
  
  try {
    const { role } = req.body;

    if (!role) {
      console.error(`[UPLOAD] ${videoId} - Missing role field`);
      return res.status(400).json({ error: 'Missing role field', videoId });
    }

    if (!req.file) {
      console.error(`[UPLOAD] ${videoId} - No video file provided`);
      return res.status(400).json({ error: 'No video file provided', videoId });
    }

    const videoPath = req.file.path;
    const newVideoPath = path.join(uploadDir, videoId + path.extname(req.file.originalname));
    
    // Rename the file to match the videoId
    fs.renameSync(videoPath, newVideoPath);
    
    console.log(`[UPLOAD] ========================================`);
    console.log(`[UPLOAD] Generated videoId: ${videoId}`);
    console.log(`[UPLOAD] Role: ${role}`);
    console.log(`[UPLOAD] File: ${req.file.originalname}`);
    console.log(`[UPLOAD] Size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[UPLOAD] Path: ${newVideoPath}`);
    
    logger.info(`Processing video for pose extraction: ${videoId}`, {
      role,
      videoPath: newVideoPath,
      filename: req.file.originalname,
      fileSize: req.file.size,
      fileSizeMB: (req.file.size / 1024 / 1024).toFixed(2)
    });

    // CRITICAL: Delete old mesh data BEFORE extracting frames
    // This prevents the frame extraction service from finding cached data from previous videos
    try {
      console.log(`[UPLOAD] 🗑️  CRITICAL: Deleting old mesh data for any previous videos before extraction`);
      await meshDataService.connect();
      // Note: We don't know the previous videoId, so we can't delete by videoId
      // Instead, the frame extraction service will check for THIS videoId's data
      // and the saveMeshData will handle deletion of old data for this videoId
      console.log(`[UPLOAD] ✓ MongoDB connected, ready for frame extraction`);
    } catch (err) {
      console.error(`[UPLOAD] Warning: Could not pre-connect to MongoDB:`, err);
      logger.warn('Could not pre-connect to MongoDB', { error: err });
    }

    // Extract frames
    let frameResult;
    try {
      frameResult = await FrameExtractionService.extractFrames(newVideoPath, videoId);
      logger.info(`Extracted ${frameResult.frameCount} frames`);
    } catch (err: any) {
      logger.error(`Frame extraction failed for ${videoId}:`, err);
      return res.status(400).json({ 
        error: 'Failed to extract frames from video. The file may be corrupted or in an unsupported format.',
        details: err.message 
      });
    }

    // Extract pose data for all frames
    const meshSequence: any[] = [];
    console.log(`[UPLOAD] Starting pose extraction for ${frameResult.frameCount} frames`);
    
    for (let i = 0; i < frameResult.frameCount; i++) {
      const frame = frameResult.frames[i];
      if (frame) {
        try {
          console.log(`[UPLOAD] Processing frame ${i}/${frameResult.frameCount}`);
          const imageBase64 = FrameExtractionService.getFrameAsBase64(frame.imagePath);
          console.log(`[UPLOAD] Frame ${i} base64 length: ${imageBase64.length}`);
          
          const poseResult = await detectPoseHybrid(imageBase64, i);
          console.log(`[UPLOAD] Frame ${i} pose result:`, {
            has3d: poseResult.has3d,
            keypointCount: poseResult.keypointCount,
            error: poseResult.error
          });
          
          meshSequence.push({
            frameNumber: i,
            timestamp: frame.timestamp,
            keypoints: poseResult.keypoints,
            has3d: poseResult.has3d,
            jointAngles3d: poseResult.jointAngles3d,
            mesh_vertices_data: poseResult.mesh_vertices_data,
            mesh_faces_data: poseResult.mesh_faces_data,
            cameraTranslation: poseResult.cameraTranslation
          });
        } catch (err) {
          console.error(`[UPLOAD] Error processing frame ${i}:`, err);
          logger.warn(`Failed to extract pose for frame ${i}:`, err);
        }
      }
    }

    logger.info(`Pose extraction complete: ${meshSequence.length} frames with pose data`);
    
    // Store mesh data in MongoDB for later retrieval
    const meshData = {
      videoId,
      role,
      fps: frameResult.fps,
      videoDuration: frameResult.videoDuration,
      frameCount: meshSequence.length,
      frames: meshSequence.map(frame => ({
        frameNumber: frame.frameNumber,
        timestamp: frame.timestamp,
        keypoints: frame.keypoints,
        skeleton: {
          vertices: frame.mesh_vertices_data || [],
          faces: frame.mesh_faces_data || [],
          has3d: frame.has3d,
          jointAngles3d: frame.jointAngles3d,
          cameraTranslation: frame.cameraTranslation
        }
      }))
    };

    try {
      // Connect to MongoDB before saving
      console.log(`[UPLOAD] Connecting to MongoDB...`);
      await meshDataService.connect();
      console.log(`[UPLOAD] ✓ Connected to MongoDB`);
      
      // Save with new unified structure
      console.log(`[UPLOAD] About to save mesh data for ${videoId}`);
      console.log(`[UPLOAD] Mesh data: ${meshData.frameCount} frames, fps: ${meshData.fps}`);
      
      await meshDataService.saveMeshData({
        videoId,
        videoUrl: `${req.protocol}://${req.get('host')}/videos/${videoId}`,
        fps: meshData.fps,
        videoDuration: meshData.videoDuration,
        frameCount: meshData.frameCount,
        totalFrames: meshData.frameCount,
        frames: meshData.frames,
        role: role as 'rider' | 'coach'
      });
      console.log(`[UPLOAD] ✓ Stored mesh data in MongoDB for ${videoId}`);
      console.log(`[UPLOAD] Saved ${meshData.frames.length} frames to MongoDB`);

      // Filter frames to keep only those with mesh data
      const meshFrameIndices = meshSequence.map((_, index) => index);
      console.log(`[UPLOAD] Filtering frames: keeping ${meshFrameIndices.length} frames with mesh data`);
      FrameExtractionService.filterFramesToMeshData(videoId, meshFrameIndices);
      
      // Rename frames to be sequential
      console.log(`[UPLOAD] Renaming frames to sequential order`);
      FrameExtractionService.renameFramesToSequential(videoId, meshFrameIndices);
      
    } catch (err) {
      console.error(`[UPLOAD] Failed to store mesh data in MongoDB:`, err);
      logger.error('Failed to store mesh data in MongoDB', { error: err });
      // Continue anyway - don't fail the upload
    }

    res.status(200).json({
      success: true,
      videoId,
      role,
      frameCount: meshSequence.length,
      meshSequence: meshSequence // Return all frames
    });
  } catch (error: any) {
    console.error(`[UPLOAD] Caught error in upload endpoint:`, error);
    logger.error('Video upload with pose error:', error);
    res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message,
      stack: error.stack
    });
  }
});

// Endpoint to store mesh data from frontend
app.post('/api/mesh-data/:videoId', express.json(), async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const meshData = req.body;

    if (!videoId || !meshData) {
      return res.status(400).json({ error: 'Missing videoId or mesh data' });
    }

    // Connect to MongoDB before saving
    await meshDataService.connect();

    await meshDataService.saveMeshData({
      videoId,
      videoUrl: meshData.videoUrl || `${req.protocol}://${req.get('host')}/videos/${videoId}`,
      role: (meshData.role || 'rider') as 'rider' | 'coach',
      fps: meshData.fps || 4,
      videoDuration: meshData.videoDuration || 0,
      frameCount: meshData.frameCount || meshData.frames?.length || 0,
      totalFrames: meshData.totalFrames || meshData.frameCount || meshData.frames?.length || 0,
      frames: meshData.frames || []
    });

    logger.info(`Stored mesh data for ${videoId}`);

    res.status(200).json({
      success: true,
      message: `Mesh data stored for ${videoId}`
    });
  } catch (error: any) {
    logger.error('Error storing mesh data:', error);
    res.status(500).json({ 
      error: 'Failed to store mesh data',
      details: error.message 
    });
  }
});

// Mesh data list endpoint (must come BEFORE /:videoId to avoid route conflict)
app.get('/api/mesh-data/list', async (req: Request, res: Response) => {
  try {
    await meshDataService.connect();
    const models = await meshDataService.getAllMeshData();
    
    console.log(`[DEBUG] Mesh data list endpoint called`);
    console.log(`[DEBUG] Found ${models.length} mesh data entries in MongoDB`);
    models.forEach((model, idx) => {
      console.log(`[DEBUG] Entry ${idx}: videoId=${model.videoId}, frameCount=${model.frameCount}, fps=${model.fps}, role=${model.role}`);
    });
    
    res.json({
      success: true,
      data: models,
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`[MESH-DATA-LIST] Error: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to list mesh data',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// DEBUG: Check what's in the database for a specific videoId
app.get('/api/debug/mesh-db/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    console.log(`[DEBUG-DB] Checking database for videoId: ${videoId}`);
    
    await meshDataService.connect();
    const meshData = await meshDataService.getMeshData(videoId);
    
    if (!meshData) {
      console.log(`[DEBUG-DB] ✗ No data found for ${videoId}`);
      return res.json({
        success: false,
        message: `No mesh data found for ${videoId}`,
        videoId
      });
    }
    
    console.log(`[DEBUG-DB] ✓ Found data for ${videoId}:`);
    console.log(`[DEBUG-DB]   videoId: ${meshData.videoId}`);
    console.log(`[DEBUG-DB]   frameCount: ${meshData.frameCount}`);
    console.log(`[DEBUG-DB]   fps: ${meshData.fps}`);
    console.log(`[DEBUG-DB]   role: ${meshData.role}`);
    console.log(`[DEBUG-DB]   frames array length: ${meshData.frames?.length || 0}`);
    if (meshData.frames && meshData.frames.length > 0) {
      console.log(`[DEBUG-DB]   first frame keypoints: ${(meshData.frames[0] as any).keypoints?.length || 0}`);
    }
    
    res.json({
      success: true,
      data: {
        videoId: meshData.videoId,
        frameCount: meshData.frameCount,
        fps: meshData.fps,
        role: meshData.role,
        framesLength: meshData.frames?.length || 0,
        firstFrameKeypointCount: (meshData.frames as any)?.[0]?.keypoints?.length || 0
      }
    });
  } catch (err: any) {
    console.error(`[DEBUG-DB] Error:`, err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Endpoint to retrieve mesh data from MongoDB
app.get('/api/mesh-data/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    console.log(`%c[API] 📥 Request for ${videoId}`, 'color: #00BFFF; font-weight: bold;');
    
    await meshDataService.connect();
    const meshData = await meshDataService.getMeshData(videoId);
    
    if (!meshData) {
      console.log(`%c[API] ❌ Not found: ${videoId}`, 'color: #FF0000;');
      return res.status(404).json({ 
        success: false,
        error: `Mesh data not found for ${videoId}`,
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }
    
    console.log(`%c[API] ✅ Found: ${meshData.frames?.length || 0} frames`, 'color: #00FF00;');
    
    // CRITICAL: Verify videoId matches
    if (meshData.videoId !== videoId) {
      console.error(`%c[API] ❌ MISMATCH: req=${videoId} got=${meshData.videoId}`, 'color: #FF0000; font-weight: bold;');
    }
    
    // Return unified MeshSequence format
    const meshSequence = {
      videoId: meshData.videoId,
      videoUrl: meshData.videoUrl || `${req.protocol}://${req.get('host')}/videos/${videoId}`,
      fps: meshData.fps,
      videoDuration: meshData.videoDuration,
      totalFrames: meshData.totalFrames || meshData.frameCount,
      frames: (meshData.frames || []).map((frame: any, idx: number) => {
        const transformed = {
          frameIndex: frame.frameNumber || 0,
          timestamp: frame.timestamp || 0,
          videoFrameData: {
            offset: frame.frameNumber || 0
          },
          meshData: {
            keypoints: frame.keypoints || [],
            skeleton: frame.skeleton || [],
            vertices: frame.skeleton?.vertices || [],
            faces: frame.skeleton?.faces || []
          }
        };
        return transformed;
      }),
      metadata: {
        uploadedAt: meshData.createdAt || new Date(),
        processingTime: 0,
        extractionMethod: 'mediapipe'
      }
    };
    
    console.log(`%c[API] 📤 Sending ${meshSequence.frames.length} frames`, 'color: #00BFFF;');
    console.log(`%c[API] 📋 First frame keypoint count: ${meshSequence.frames[0]?.meshData?.keypoints?.length || 0}`, 'color: #00BFFF;');
    
    // Set cache-busting headers to prevent browser/proxy caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json({
      success: true,
      data: meshSequence,
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);
    
  } catch (error: any) {
    console.error(`%c[API] ❌ Error: ${error.message}`, 'color: #FF0000;');
    logger.error('Error retrieving mesh data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve mesh data',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

app.post('/api/form-analysis/upload', upload.single('video'), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  
  try {
    logger.info(`[${requestId}] Form analysis upload request received`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      file: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        destination: req.file.destination,
        filename: req.file.filename,
        path: req.file.path
      } : null
    });

    if (!req.file) {
      logger.warn(`[${requestId}] No video file provided in request`);
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    logger.info(`[${requestId}] Video file received`, {
      filename: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });

    // Connect to database
    logger.info(`[${requestId}] Connecting to MongoDB...`);
    const db = await connectDB();
    logger.info(`[${requestId}] ✓ Connected to MongoDB`);

    // Import pipeline
    logger.info(`[${requestId}] Pipeline ready`);

    // Parse optional parameters
    const { intendedTrick, stance } = req.body;
    logger.info(`[${requestId}] Request parameters`, {
      intendedTrick,
      stance
    });

    // Validate stance if provided
    if (stance && !['regular', 'goofy'].includes(stance)) {
      logger.warn(`[${requestId}] Invalid stance provided: ${stance}`);
      return res.status(400).json({
        success: false,
        error: 'stance must be "regular" or "goofy"',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Process video
    logger.info(`[${requestId}] Starting video processing pipeline...`);
    const result = await processVideoUpload(db, {
      videoPath: req.file.path,
      intendedTrick,
      stance: stance as 'regular' | 'goofy' | undefined,
    });

    logger.info(`[${requestId}] Pipeline result`, {
      status: result.status,
      videoId: result.videoId,
      error: result.error
    });

    if (result.status === 'failed') {
      logger.error(`[${requestId}] Video processing failed`, {
        error: result.error
      });
      return res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Fetch the complete analysis
    logger.info(`[${requestId}] Fetching analysis for videoId: ${result.videoId}`);
    const analysis = await getVideoAnalysis(db, result.videoId);

    if (!analysis) {
      logger.error(`[${requestId}] Failed to retrieve analysis from database`);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    logger.info(`[${requestId}] ✓ Analysis complete`, {
      videoId: analysis.videoId,
      duration: analysis.duration,
      frameCount: analysis.frameCount,
      fps: analysis.fps,
      stance: analysis.stance
    });

    return res.status(200).json({
      success: true,
      data: {
        videoId: analysis.videoId,
        duration: analysis.duration,
        frameCount: analysis.frameCount,
        fps: analysis.fps,
        stance: analysis.stance,
        phases: analysis.phases,
        summary: analysis.summary,
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (error: any) {
    logger.error(`[${requestId}] Form analysis upload error`, {
      error: error.message,
      stack: error.stack,
      name: error.name
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process video',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Video upload and analysis endpoint (DEPRECATED - use /api/video/analyze-pose instead)
/*
app.post('/api/video/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const videoId = Date.now().toString();
    const videoPath = req.file.path;

    logger.info(`Video uploaded: ${req.file.originalname}`, {
      videoId,
      filename: req.file.originalname,
      size: req.file.size,
      path: videoPath
    });

    // Extract frames
    logger.info(`Starting frame extraction for video: ${videoId}`);
    const frameResult = await FrameExtractionService.extractFrames(videoPath, videoId);

    logger.info(`Frame extraction completed: ${frameResult.frameCount} frames`, {
      videoId,
      frameCount: frameResult.frameCount,
      duration: frameResult.videoDuration
    });

    // Pose estimation is now done by Python service on demand

    // Prepare all frames for LLM analysis
    logger.info(`Preparing frames for LLM analysis`);
    const framesForLLM = frameResult.frames.map(f => ({
      frameNumber: f.frameNumber,
      timestamp: f.timestamp,
      imageBase64: FrameExtractionService.getFrameAsBase64(f.imagePath)
    }));

    logger.info(`Sending ${framesForLLM.length} frames to LLM for trick detection`);

    // Detect trick using LLM
    const trickDetection = await LLMTrickDetectionService.detectTrickFromFrames(
      framesForLLM,
      poseResults.map(p => ({
        keypoints: p.keypoints,
        frameNumber: p.frameNumber
      }))
    );

    // Log detailed analysis
    LLMTrickDetectionService.logAnalysisDetails(trickDetection);

    logger.info(`✅ Trick detected: ${trickDetection.trickName}`, {
      videoId,
      trickName: trickDetection.trickName,
      rotationCount: trickDetection.rotationCount,
      rotationDirection: trickDetection.rotationDirection,
      confidence: trickDetection.confidence,
      difficulty: trickDetection.estimatedDifficulty,
      styleElements: trickDetection.styleElements
    });

    // Add mesh overlays to preview frames
    logger.info(`Adding mesh overlays to preview frames`);
    const previewFrames = frameResult.frames.slice(0, 5);
    const framePaths = previewFrames.map(f => f.imagePath);
    const meshOverlays = await meshVisualizationService.addMeshOverlayToFrames(framePaths);

    // Combine frame data with mesh overlays
    const framesWithMesh = previewFrames.map((frame, index) => ({
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
      imagePath: frame.imagePath,
      meshOverlay: meshOverlays[index] // Base64-encoded PNG with mesh
    }));

    logger.info(`Mesh overlays completed for ${framesWithMesh.length} frames`);

    // Return analysis results
    res.json({
      success: true,
      data: {
        videoId,
        filename: req.file.originalname,
        frameCount: frameResult.frameCount,
        duration: frameResult.videoDuration,
        trick: {
          name: trickDetection.trickName,
          rotationDirection: trickDetection.rotationDirection,
          rotationCount: trickDetection.rotationCount,
          difficulty: trickDetection.estimatedDifficulty,
          confidence: trickDetection.confidence,
          description: trickDetection.description
        },
        frames: framesWithMesh // Return frames with mesh overlays
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Video upload error: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process video',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});
*/

// Get video frames endpoint
app.get('/api/video/:videoId/frames', (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { start = 0, count = 10 } = req.query;

    logger.info(`Fetching frames for video: ${videoId}`, {
      videoId,
      start,
      count
    });

    const cachedFrames = FrameExtractionService.getCachedFrames(videoId);

    if (!cachedFrames) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const startIdx = parseInt(start as string) || 0;
    const countNum = parseInt(count as string) || 10;
    const frames = cachedFrames.frames.slice(startIdx, startIdx + countNum);

    // Convert frames to base64
    const framesWithData = frames.map(f => ({
      frameNumber: f.frameNumber,
      timestamp: f.timestamp,
      imagePath: f.imagePath,
      imageBase64: FrameExtractionService.getFrameAsBase64(f.imagePath)
    }));

    res.json({
      success: true,
      data: {
        videoId,
        totalFrames: cachedFrames.frameCount,
        frames: framesWithData
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Failed to fetch frames: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch frames',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get frame by number endpoint
app.get('/api/video/:videoId/frame/:frameNumber', (req: Request, res: Response) => {
  try {
    const { videoId, frameNumber } = req.params;

    logger.info(`Fetching frame ${frameNumber} for video: ${videoId}`);

    const cachedFrames = FrameExtractionService.getCachedFrames(videoId);

    if (!cachedFrames) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const frameNum = parseInt(frameNumber);
    const frame = cachedFrames.frames[frameNum];

    if (!frame) {
      return res.status(404).json({
        success: false,
        error: 'Frame not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const imageBase64 = FrameExtractionService.getFrameAsBase64(frame.imagePath);

    res.json({
      success: true,
      data: {
        videoId,
        frameNumber: frame.frameNumber,
        timestamp: frame.timestamp,
        imageBase64
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Failed to fetch frame: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch frame',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Chat endpoints
app.post('/api/chat/session', async (req: Request, res: Response) => {
  try {
    const { videoId, analysis } = req.body;

    if (!videoId || !analysis) {
      return res.status(400).json({
        success: false,
        error: 'videoId and analysis required',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const session = ChatService.createSession(videoId, analysis);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        videoId: session.videoId,
        messages: session.messages
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Failed to create chat session: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

app.get('/api/chat/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = ChatService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        videoId: session.videoId,
        messages: session.messages,
        analysisContext: session.analysisContext
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Failed to get session: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to get session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

app.post('/api/chat/message', (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and message required',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const session = ChatService.addMessage(sessionId, {
      role: 'user',
      content: message
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    logger.info(`Message added to session: ${sessionId}`);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        messages: session.messages
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Failed to add message: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to add message',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// TESTING MODE: Single frame pose visualization (no LLM calls) - DEPRECATED
/*
app.post('/api/video/test-pose', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const videoId = Date.now().toString();
    const videoPath = req.file.path;
    const frameIndex = parseInt(req.body.frameIndex) || -1; // -1 = middle frame

    logger.info(`[TEST MODE] Video uploaded: ${req.file.originalname}`, {
      videoId,
      filename: req.file.originalname,
      size: req.file.size,
      requestedFrame: frameIndex
    });

    // Extract frames
    const frameResult = await FrameExtractionService.extractFrames(videoPath, videoId);
    const actualFrameCount = frameResult.frames.length;
    logger.info(`[TEST MODE] Extracted ${actualFrameCount} actual frames (frameCount reported: ${frameResult.frameCount})`);

    if (actualFrameCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No frames could be extracted from video',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Select target frame (middle frame if not specified) - use actual frame count
    const targetFrameIndex = frameIndex >= 0 ? Math.min(frameIndex, actualFrameCount - 1) : Math.floor(actualFrameCount / 2);
    const targetFrame = frameResult.frames[targetFrameIndex];

    if (!targetFrame) {
      return res.status(400).json({
        success: false,
        error: `Frame ${targetFrameIndex} not found. Only ${actualFrameCount} frames available.`,
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    logger.info(`[TEST MODE] Analyzing frame ${targetFrameIndex} of ${actualFrameCount}`, {
      framePath: targetFrame.imagePath,
      frameExists: fs.existsSync(targetFrame.imagePath)
    });

    // Pose estimation is now done by Python service
    // This endpoint is deprecated - use /api/video/analyze-pose instead

    logger.info(`[TEST MODE] Pose estimation complete`, {
      keypointCount: poseResult.keypoints.length,
      confidence: poseResult.confidence
    });

    // Draw pose visualization on frame using sharp
    const sharp = require('sharp');
    
    // Get image dimensions
    const imageMetadata = await sharp(targetFrame.imagePath).metadata();
    const imgWidth = imageMetadata.width || 640;
    const imgHeight = imageMetadata.height || 480;

    // Skeleton connections (MediaPipe indices)
    const connections = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso
      [23, 24], // hips
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28], // right leg
      [27, 29], [29, 31], // left foot
      [28, 30], [30, 32], // right foot
    ];

    // Build SVG overlay with skeleton lines and keypoints
    let svgLines = '';
    for (const [start, end] of connections) {
      const startKp = poseResult.keypoints[start];
      const endKp = poseResult.keypoints[end];
      if (startKp && endKp && startKp.confidence > 0.3 && endKp.confidence > 0.3) {
        svgLines += `<line x1="${startKp.x}" y1="${startKp.y}" x2="${endKp.x}" y2="${endKp.y}" stroke="#FF00FF" stroke-width="3"/>`;
      }
    }

    // Draw keypoints as circles
    let svgCircles = '';
    for (const kp of poseResult.keypoints) {
      if (kp.confidence > 0.3) {
        svgCircles += `<circle cx="${kp.x}" cy="${kp.y}" r="5" fill="#00FF00"/>`;
      }
    }

    // Draw labels for key joints
    const labeledJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    const jointNames = ['L.Shoulder', 'R.Shoulder', 'L.Elbow', 'R.Elbow', 'L.Wrist', 'R.Wrist', 'L.Hip', 'R.Hip', 'L.Knee', 'R.Knee', 'L.Ankle', 'R.Ankle'];
    let svgLabels = '';
    labeledJoints.forEach((idx, i) => {
      const kp = poseResult.keypoints[idx];
      if (kp && kp.confidence > 0.3) {
        svgLabels += `<text x="${kp.x + 8}" y="${kp.y - 5}" fill="white" font-size="12" font-family="Arial">${jointNames[i]}</text>`;
      }
    });

    const svgOverlay = `<svg width="${imgWidth}" height="${imgHeight}">
      ${svgLines}
      ${svgCircles}
      ${svgLabels}
    </svg>`;

    // Composite SVG overlay on top of original image
    const visualizationBuffer = await sharp(targetFrame.imagePath)
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    const visualizationBase64 = visualizationBuffer.toString('base64');

    // Return results
    res.json({
      success: true,
      data: {
        videoId,
        frameIndex: targetFrameIndex,
        totalFrames: actualFrameCount,
        timestamp: targetFrame.timestamp,
        poseConfidence: poseResult.confidence,
        keypointsDetected: poseResult.keypoints.filter((k: any) => k.confidence > 0.3).length,
        totalKeypoints: poseResult.keypoints.length,
        visualization: `data:image/png;base64,${visualizationBase64}`,
        keypoints: poseResult.keypoints.map((k: any) => ({
          name: k.name,
          x: Math.round(k.x),
          y: Math.round(k.y),
          confidence: Math.round(k.confidence * 100) / 100
        }))
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`[TEST MODE] Error: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process video',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});
*/

// NEW: Full pose analysis with Python MediaPipe service - DEPRECATED
/*
app.post('/api/video/analyze-pose', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const videoId = Date.now().toString();
    const videoPath = req.file.path;
    const fps = parseInt(req.body.fps) || 30; // Default 30 FPS for better frame density

    logger.info(`[POSE ANALYSIS] Video uploaded: ${req.file.originalname}`, {
      videoId,
      filename: req.file.originalname,
      size: req.file.size,
      fps
    });

    // Check if Python pose service is running
    const poseServiceHealthy = await checkPoseServiceHealth();
    if (!poseServiceHealthy) {
      return res.status(503).json({
        success: false,
        error: 'Pose service not available. Start it with: cd backend/pose-service && python app.py',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Extract frames
    const frameResult = await FrameExtractionService.extractFrames(videoPath, videoId, fps);
    const actualFrameCount = frameResult.frames.length;
    logger.info(`[POSE ANALYSIS] Extracted ${actualFrameCount} frames`);

    if (actualFrameCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No frames could be extracted from video',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Process all extracted frames
    const framesToAnalyze = frameResult.frames;
    
    // Read frames as base64
    const framesWithBase64 = framesToAnalyze.map(f => ({
      imageBase64: fs.readFileSync(f.imagePath).toString('base64'),
      frameNumber: f.frameNumber,
      timestamp: f.timestamp
    }));

    // Call Python pose service for all frames in parallel
    logger.info(`[POSE ANALYSIS] Sending ${framesWithBase64.length} frames to Python pose service`);
    const poseFrames = await detectPoseParallel(
      framesWithBase64.map(f => ({
        imageBase64: f.imageBase64,
        frameNumber: f.frameNumber
      }))
    );

    // Run MCP tool analysis on each frame
    const analysisLog = new AnalysisLogBuilder();
    const frameAnalyses: FrameAnalysis[] = [];
    
    for (let i = 0; i < poseFrames.length; i++) {
      const poseFrame = poseFrames[i];
      const timestamp = framesWithBase64[i].timestamp;
      
      if (!poseFrame.error && poseFrame.keypoints.length > 0) {
        const analysis = analyzeFrame(poseFrame, timestamp, analysisLog);
        frameAnalyses.push(analysis);
      } else {
        frameAnalyses.push({
          frameNumber: poseFrame.frameNumber,
          timestamp,
          phase: 'unknown',
          toolResults: { error: poseFrame.error || 'No keypoints detected' },
          confidence: 0
        });
      }
    }

    // Generate visualizations for all frames
    logger.info(`[POSE ANALYSIS] Generating visualizations`);
    const visualizations = await visualizePoseSequence(
      framesWithBase64.map((f, i) => ({
        imageBase64: f.imageBase64,
        poseFrame: poseFrames[i],
        timestamp: f.timestamp
      }))
    );

    // Build final analysis log
    const finalLog = analysisLog.build();

    logger.info(`[POSE ANALYSIS] Complete`, {
      videoId,
      framesAnalyzed: poseFrames.length,
      toolCalls: finalLog.mcpToolCalls.length,
      totalTimeMs: finalLog.totalProcessingTimeMs
    });

    // Return results
    res.json({
      success: true,
      data: {
        videoId,
        totalFrames: actualFrameCount,
        analyzedFrames: poseFrames.length,
        duration: frameResult.videoDuration,
        visualizations: visualizations.map((v: any) => ({
          frameNumber: v.frameNumber,
          timestamp: v.timestamp,
          imageBase64: `data:image/png;base64,${v.annotatedImageBase64}`
        })),
        frameAnalyses,
        analysisLog: finalLog,
        poseData: poseFrames.map(pf => ({
          frameNumber: pf.frameNumber,
          keypointCount: pf.keypointCount,
          processingTimeMs: pf.processingTimeMs,
          error: pf.error,
          keypoints: pf.keypoints.map(kp => ({
            name: kp.name,
            x: Math.round(kp.x),
            y: Math.round(kp.y),
            confidence: Math.round(kp.confidence * 100) / 100
          }))
        }))
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`[POSE ANALYSIS] Error: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to analyze video',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});
*/

// Pose service health check endpoint (simple)
app.get('/api/pose-service/health', async (req: Request, res: Response) => {
  const healthy = await checkPoseServiceHealth();
  res.json({
    success: true,
    data: {
      poseServiceHealthy: healthy,
      poseServiceUrl: process.env.POSE_SERVICE_URL || 'http://localhost:5000'
    },
    timestamp: new Date().toISOString()
  } as ApiResponse<any>);
});

// Pose service full status endpoint (for mobile app)
app.get('/api/pose/health', async (req: Request, res: Response) => {
  const { getPoseServiceStatus } = await import('./services/pythonPoseService');
  const status = await getPoseServiceStatus();
  res.json(status);
});

// Pose service warmup endpoint (proxy to WSL pose service)
app.post('/api/pose/warmup', async (req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    const response = await axios.get(`${poseServiceUrl}/warmup`, { timeout: 120000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message || 'Failed to warmup pose service' 
    });
  }
});

// Pose service reload endpoint (hot-reload code without reloading models)
app.post('/api/pose/reload', async (req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    const response = await axios.post(`${poseServiceUrl}/reload`, {}, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message || 'Failed to reload pose service' 
    });
  }
});

// Proxy endpoint for pose hybrid analysis (mobile app uses this)
app.post('/api/pose/hybrid', upload.single('frame'), async (req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    
    if (!req.file) {
      return res.status(400).json({ error: 'No frame provided' });
    }

    const form = new FormData();
    form.append('frame', fs.createReadStream(req.file.path), {
      filename: req.file.originalname || 'frame.jpg',
      contentType: 'image/jpeg'
    });
    
    if (req.body.frameNumber) {
      form.append('frameNumber', req.body.frameNumber);
    }

    const response = await axios.post(`${poseServiceUrl}/pose/hybrid`, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    res.json(response.data);
  } catch (error: any) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    logger.error(`[POSE_HYBRID] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// 4D-Humans (HMR2) 3D pose analysis endpoint
app.post('/api/video/analyze-4d', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const videoId = Date.now().toString();
    const videoPath = req.file.path;
    const fps = parseInt(req.body.fps) || 2; // Lower FPS for 3D (slower)

    logger.info(`[4D-HUMANS] Video uploaded: ${req.file.originalname}`, {
      videoId,
      filename: req.file.originalname,
      size: req.file.size,
      fps
    });

    // Check if Python pose service is running
    const poseServiceHealthy = await checkPoseServiceHealth();
    if (!poseServiceHealthy) {
      return res.status(503).json({
        success: false,
        error: 'Pose service not available. Start it with: cd backend/pose-service && .\\venv\\Scripts\\python.exe app.py',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Extract frames
    const frameResult = await FrameExtractionService.extractFrames(videoPath, videoId, fps);
    const actualFrameCount = frameResult.frames.length;
    logger.info(`[4D-HUMANS] Extracted ${actualFrameCount} frames`);

    if (actualFrameCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No frames could be extracted from video',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Limit to 5 frames for 4D-Humans (GPU intensive)
    const framesToAnalyze = frameResult.frames.slice(0, 5);
    
    // Read frames as base64
    const framesWithBase64 = framesToAnalyze.map(f => ({
      imageBase64: fs.readFileSync(f.imagePath).toString('base64'),
      frameNumber: f.frameNumber,
      timestamp: f.timestamp
    }));

    // Call 4D-Humans hybrid endpoint with visualization enabled
    logger.info(`[4D-HUMANS] Sending ${framesWithBase64.length} frames to 4D-Humans with visualization`);
    const poseFrames = await detectPoseHybridBatch(
      framesWithBase64.map(f => ({
        imageBase64: f.imageBase64,
        frameNumber: f.frameNumber
      })),
      true // Enable Python-side visualization with skeleton overlay
    );

    // Use Python-generated visualizations (skeleton drawn by OpenCV)
    const visualizations = framesWithBase64.map((f, i) => {
      const poseData = poseFrames[i];
      // Use Python visualization if available, otherwise fall back to raw frame
      if (poseData && poseData.visualization) {
        return {
          frameNumber: f.frameNumber,
          timestamp: f.timestamp,
          imageBase64: poseData.visualization // Already has data:image/png;base64, prefix
        };
      }
      return {
        frameNumber: f.frameNumber,
        timestamp: f.timestamp,
        imageBase64: `data:image/jpeg;base64,${f.imageBase64}`
      };
    });

    const has3dCount = poseFrames.filter(p => p.has3d).length;
    const successCount = poseFrames.filter(p => !p.error).length;

    logger.info(`[4D-HUMANS] Analysis complete`, {
      videoId,
      framesAnalyzed: poseFrames.length,
      has3dCount,
      successCount
    });

    // Return results
    res.json({
      success: true,
      data: {
        videoId,
        totalFrames: actualFrameCount,
        analyzedFrames: poseFrames.length,
        has3dFrames: has3dCount,
        duration: frameResult.videoDuration,
        visualizations,
        poseData: poseFrames.map((pf, i) => ({
          frameNumber: pf.frameNumber,
          timestamp: framesWithBase64[i].timestamp,
          keypointCount: pf.keypointCount,
          processingTimeMs: pf.processingTimeMs,
          modelVersion: pf.modelVersion,
          has3d: pf.has3d,
          jointAngles3d: pf.jointAngles3d,
          error: pf.error,
          keypoints: pf.keypoints.slice(0, 10).map(kp => ({
            name: kp.name,
            x: Math.round(kp.x * 100) / 100,
            y: Math.round(kp.y * 100) / 100,
            z: kp.z ? Math.round(kp.z * 100) / 100 : undefined,
            confidence: Math.round(kp.confidence * 100) / 100
          }))
        }))
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`[4D-HUMANS] Error: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to analyze video',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Knowledge base endpoints
app.get('/api/knowledge/phase/:phase', (req: Request, res: Response) => {
  try {
    const { phase } = req.params;
    const { query } = req.query;

    const knowledge = KnowledgeBaseService.retrievePhaseKnowledge(phase, query as string);

    res.json({
      success: true,
      data: {
        phase,
        entries: knowledge,
        count: knowledge.length
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Failed to retrieve knowledge: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve knowledge',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

app.get('/api/knowledge/search', (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter required',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const results = KnowledgeBaseService.search(q as string);

    res.json({
      success: true,
      data: {
        query: q,
        results,
        count: results.length
      },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`Knowledge search failed: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Search failed',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Debug frames API
app.get('/api/debug/frames', (req: Request, res: Response) => {
  try {
    const debugDir = path.join(process.cwd(), '.debug-frames');
    if (!fs.existsSync(debugDir)) {
      return res.json({ frames: [], count: 0 });
    }

    const frames = fs.readdirSync(debugDir)
      .filter(f => f.startsWith('frame'))
      .map(f => {
        const frameNum = parseInt(f.replace(/frame-?/, '')) || f;
        const framePath = path.join(debugDir, f);
        const metadataPath = path.join(framePath, 'metadata.json');
        
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
          try {
            const content = fs.readFileSync(metadataPath, 'utf-8');
            metadata = JSON.parse(content);
          } catch (e) {
            // Ignore parse errors
          }
        }

        return {
          frameNumber: frameNum,
          frameName: f,
          metadata,
        };
      })
      .sort((a, b) => {
        const aNum = typeof a.frameNumber === 'number' ? a.frameNumber : 0;
        const bNum = typeof b.frameNumber === 'number' ? b.frameNumber : 0;
        return aNum - bNum;
      });

    res.json({ frames, count: frames.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/frame/:frameNumber', (req: Request, res: Response) => {
  try {
    const frameNumber = req.params.frameNumber;
    const debugDir = path.join(process.cwd(), '.debug-frames');
    
    // Try both naming conventions
    let frameDir = path.join(debugDir, `frame-${frameNumber}`);
    if (!fs.existsSync(frameDir)) {
      frameDir = path.join(debugDir, `frame${frameNumber}`);
    }
    if (!fs.existsSync(frameDir)) {
      frameDir = path.join(debugDir, frameNumber);
    }
    
    const imagePath = path.join(frameDir, 'frame.png');
    const metadataPath = path.join(frameDir, 'metadata.json');

    let imageBase64: string | null = null;
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      imageBase64 = imageBuffer.toString('base64');
    }

    let metadata: any = null;
    if (fs.existsSync(metadataPath)) {
      try {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(content);
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (!imageBase64 && !metadata) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    res.json({
      frameNumber,
      image: imageBase64,
      metadata,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/frame/:frameNumber/image', (req: Request, res: Response) => {
  try {
    const frameNumber = parseInt(req.params.frameNumber);
    const debugDir = path.join(process.cwd(), '.debug-frames');
    const frameDir = path.join(debugDir, `frame-${frameNumber}`);
    const imagePath = path.join(frameDir, 'frame.png');

    if (!fs.existsSync(imagePath)) {
      return res.status(404).send('Frame not found');
    }

    res.setHeader('Content-Type', 'image/png');
    res.sendFile(imagePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debug/frames', (req: Request, res: Response) => {
  try {
    const debugDir = path.join(process.cwd(), '.debug-frames');
    if (fs.existsSync(debugDir)) {
      fs.rmSync(debugDir, { recursive: true, force: true });
    }
    fs.mkdirSync(debugDir, { recursive: true });

    res.json({ success: true, message: 'All debug frames cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug frame viewer
app.get('/debug-frames', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), '.debug-frames', 'viewer.html'));
});

// Auto-fix mesh projection for a video
app.post('/api/video/:videoId/auto-fix-mesh', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    // DEPRECATED - mesh auto-fixer not available
    res.status(501).json({
      success: false,
      error: 'Mesh auto-fixer endpoint deprecated',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Endpoint deprecated',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Test endpoint to capture a debug frame from pose service
app.post('/api/debug/test-capture', async (req: Request, res: Response) => {
  try {
    logger.info('Testing debug frame capture...');
    
    // Create a simple test image (100x100 RGB)
    const testImageBuffer = Buffer.alloc(100 * 100 * 3);
    for (let i = 0; i < testImageBuffer.length; i += 3) {
      testImageBuffer[i] = Math.random() * 255;     // R
      testImageBuffer[i + 1] = Math.random() * 255; // G
      testImageBuffer[i + 2] = Math.random() * 255; // B
    }
    
    // Convert to PNG (simple approach - just use raw data as base64)
    const base64Image = testImageBuffer.toString('base64');
    
    // Save debug frame
    const debugDir = path.join(process.cwd(), '.debug-frames');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const frameNumber = Math.floor(Date.now() / 1000) % 1000;
    const frameDir = path.join(debugDir, `frame-${frameNumber}`);
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }
    
    // Save metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      frameNumber,
      test: true,
      keypoints: 23,
      meshVertices: 6890,
      meshFaces: 13776,
      processingTime: 245,
      model: 'HMR2/ViTDet',
      message: 'This is a test frame. Upload a real video to see actual pose data.'
    };
    
    const metadataPath = path.join(frameDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    logger.info(`Test frame saved: frame-${frameNumber}`);
    
    res.json({
      success: true,
      message: `Test frame ${frameNumber} created. Check http://localhost:${PORT}/debug-frames`,
      frameNumber,
      frameDir
    });
  } catch (error: any) {
    logger.error(`Failed to create test frame: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Full video mesh overlay processing endpoint
app.post('/api/video/process_video', upload.single('video'), async (req: Request, res: Response) => {
  try {
    logger.info(`[PROCESS_VIDEO] Request received`);
    logger.info(`[PROCESS_VIDEO] req.file exists: ${!!req.file}`);
    
    if (!req.file) {
      logger.error(`[PROCESS_VIDEO] No file in req.file`);
      return res.status(400).json({
        error: 'No video file provided',
        status: 'error'
      });
    }

    const videoPath = req.file.path;
    logger.info(`[PROCESS_VIDEO] Starting full video processing: ${videoPath}`);
    logger.info(`[PROCESS_VIDEO] File size: ${req.file.size} bytes`);
    logger.info(`[PROCESS_VIDEO] File originalname: ${req.file.originalname}`);

    // Call the pose service to process the video
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    
    // Get parameters from request (FormData fields are in req.body)
    const maxFrames = (req as any).body?.max_frames || (req as any).query?.max_frames || '999999';
    const outputFormat = (req as any).body?.output_format || (req as any).query?.output_format || 'file_path';
    
    logger.info(`[PROCESS_VIDEO] req.body keys:`, Object.keys((req as any).body || {}));
    logger.info(`[PROCESS_VIDEO] req.query keys:`, Object.keys((req as any).query || {}));
    logger.info(`[PROCESS_VIDEO] Parameters: max_frames=${maxFrames}, output_format=${outputFormat}`);
    
    // Use file stream with FormData for proper multipart/form-data encoding
    const form = new FormData();
    const fileStream = fs.createReadStream(videoPath);
    form.append('video', fileStream, req.file.originalname);
    form.append('max_frames', String(maxFrames));
    form.append('output_format', outputFormat);

    logger.info(`[PROCESS_VIDEO] FormData prepared with stream, sending to: ${poseServiceUrl}/process_video`);
    logger.info(`[PROCESS_VIDEO] FormData headers:`, form.getHeaders());

    let response;
    try {
      response = await axios.post(`${poseServiceUrl}/process_video`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 0 // No timeout - let it run as long as needed
      });

      logger.info(`[PROCESS_VIDEO] Response status: ${response.status}`);
    } catch (axiosErr: any) {
      logger.error(`[PROCESS_VIDEO] Axios error: ${axiosErr.message}`);
      if (axiosErr.response) {
        logger.error(`[PROCESS_VIDEO] Response status: ${axiosErr.response.status}`);
        logger.error(`[PROCESS_VIDEO] Response data:`, axiosErr.response.data);
      }
      throw axiosErr;
    }

    // Response is JSON metadata with frames
    const poseServiceResponse: any = response.data;
    logger.info(`[PROCESS_VIDEO] Pose service response status: ${poseServiceResponse.status}`);
    logger.info(`[PROCESS_VIDEO] Processing complete with ${poseServiceResponse.data?.frames?.length || 0} frames`);

    // Clean up uploaded file
    fs.unlink(videoPath, (err) => {
      if (err) logger.warn(`Failed to delete temp video: ${err}`);
    });

    // Extract data from pose service response
    const result = poseServiceResponse.data || poseServiceResponse;
    
    res.json({
      status: 'success',
      data: result
    });

  } catch (err: any) {
    const errorMessage = err?.message || String(err) || 'Unknown error';
    logger.error(`[PROCESS_VIDEO] Error: ${errorMessage}`, { error: err });
    logger.error(`[PROCESS_VIDEO] Stack:`, err?.stack);
    
    // Clean up on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) logger.warn(`Failed to delete temp video: ${err}`);
      });
    }

    res.status(500).json({
      error: `Processing error: ${errorMessage}`,
      status: 'error'
    });
  }
});

// Async video processing - submit job
app.post('/api/video/process_async', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'max_frames', maxCount: 1 }]), async (req: Request, res: Response) => {
  try {
    logger.info(`[ASYNC] Request received`);
    logger.info(`[ASYNC] Content-Type: ${req.headers['content-type']}`);
    logger.info(`[ASYNC] req.body:`, (req as any).body);
    logger.info(`[ASYNC] req.query keys:`, Object.keys((req as any).query || {}));
    logger.info(`[ASYNC] req.files keys:`, Object.keys((req as any).files || {}));
    
    const files = (req as any).files;
    if (!files || !files.video || !files.video[0]) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoFile = files.video[0];
    const videoPath = videoFile.path;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    
    // Extract max_frames from FormData fields (multer parses as array)
    let maxFrames = '999999';
    if ((req as any).body?.max_frames) {
      maxFrames = Array.isArray((req as any).body.max_frames) 
        ? (req as any).body.max_frames[0] 
        : (req as any).body.max_frames;
    } else if ((req as any).query?.max_frames) {
      maxFrames = (req as any).query.max_frames;
    }
    logger.info(`[ASYNC] max_frames extracted: ${maxFrames}`);
    
    // Forward to pose service async endpoint
    const form = new FormData();
    form.append('video', fs.createReadStream(videoPath), {
      filename: videoFile.originalname || 'video.mp4',
      contentType: 'video/mp4'
    });
    form.append('max_frames', maxFrames);
    
    logger.info(`[ASYNC] Forwarding to pose service with max_frames=${maxFrames}`);
    logger.info(`[ASYNC] Pose service URL: ${poseServiceUrl}/process_video_async`);

    const response = await axios.post(`${poseServiceUrl}/process_video_async`, form, {
      headers: form.getHeaders(),
      timeout: 30000 // 30 second timeout just for submitting
    });

    // Clean up uploaded file
    fs.unlink(videoPath, () => {});

    logger.info(`[ASYNC] Job submitted: ${response.data.job_id}`);
    res.json(response.data);
  } catch (err: any) {
    logger.error(`[ASYNC] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Check async job status
app.get('/api/video/job_status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    
    const response = await axios.get(`${poseServiceUrl}/job_status/${jobId}`, {
      timeout: 10000
    });

    res.json(response.data);
  } catch (err: any) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Job not found' });
    }
    logger.error(`[JOB_STATUS] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Serve output video file
app.get('/api/video/output/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    
    logger.info(`[VIDEO_OUTPUT] Fetching output video for job ${jobId}`);
    
    // Get job status to find output video path
    const statusResponse = await axios.get(`${poseServiceUrl}/job_status/${jobId}`, {
      timeout: 10000
    });
    
    if (statusResponse.data.status !== 'complete') {
      return res.status(400).json({ error: 'Job not complete' });
    }
    
    const outputPath = statusResponse.data.result?.output_path;
    if (!outputPath) {
      return res.status(404).json({ error: 'Output video not found' });
    }
    
    logger.info(`[VIDEO_OUTPUT] Serving video from: ${outputPath}`);
    
    // Serve the video file
    const fs = require('fs');
    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ error: 'Video file not found on disk' });
    }
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="output_${jobId}.mp4"`);
    
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);
    
  } catch (err: any) {
    logger.error(`[VIDEO_OUTPUT] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Serve individual frame as JPEG image
app.get('/api/video/frame/:jobId/:frameIndex', async (req: Request, res: Response) => {
  try {
    const { jobId, frameIndex } = req.params;
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    
    logger.info(`[FRAME] Fetching frame ${frameIndex} for job ${jobId}`);
    
    // Proxy to pose service frame endpoint
    const response = await axios.get(`${poseServiceUrl}/frame/${jobId}/${frameIndex}`, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(response.data);
    
  } catch (err: any) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Frame not found' });
    }
    logger.error(`[FRAME] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});


// Download processed video file
app.get('/api/video/download', (req: Request, res: Response) => {
  try {
    let { path: videoPath } = req.query;
    
    if (!videoPath || typeof videoPath !== 'string') {
      return res.status(400).json({ error: 'Missing path query parameter' });
    }
    
    logger.info(`[DOWNLOAD] Download request for: ${videoPath}`);

    // Security: prevent directory traversal
    if (videoPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Convert WSL path to Windows path if needed
    if (videoPath.startsWith('/mnt/c/')) {
      videoPath = videoPath.replace('/mnt/c/', 'C:\\');
    }
    
    logger.info(`[DOWNLOAD] Converted path: ${videoPath}`);
    logger.info(`[DOWNLOAD] Attempting to download: ${videoPath}`);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      logger.warn(`[DOWNLOAD] File not found: ${videoPath}`);
      logger.warn(`[DOWNLOAD] Current working directory: ${process.cwd()}`);
      return res.status(404).json({ error: `Video file not found: ${videoPath}` });
    }

    // Get file size
    const stats = fs.statSync(videoPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    // Extract just the filename for the response header
    const responseFilename = path.basename(videoPath);
    logger.info(`[DOWNLOAD] Serving video: ${responseFilename} (${fileSizeInMB} MB)`);

    // Set headers for video download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${responseFilename}"`);
    res.setHeader('Content-Length', stats.size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(videoPath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      logger.error(`[DOWNLOAD] Stream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download video' });
      }
    });
  } catch (error: any) {
    logger.error(`[DOWNLOAD] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Delete mesh data endpoint
app.delete('/api/mesh-data/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    await meshDataService.connect();
    const deleted = await meshDataService.deleteMeshData(videoId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Mesh data not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    res.json({
      success: true,
      data: { videoId, deleted: true },
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    logger.error(`[MESH-DATA-DELETE] Error: ${err.message}`, { error: err });
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete mesh data',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize knowledge base
    await KnowledgeBaseService.initialize();
    
    // Initialize frame data service
    initializeFrameDataService({
      uploadDir: uploadDir
    });
    
    // Initialize process pool manager for pose detection
    const posePoolConfig = loadPosePoolConfig();
    poolManager = new ProcessPoolManager(posePoolConfig);
    
    // Initialize database connection
    const { connectToDatabase } = await import('./db/connection');
    await connectToDatabase();

    // Check pose service health on startup (non-blocking, just for diagnostics)
    console.log(`[STARTUP] Checking pose service health...`);
    const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
    console.log(`[STARTUP] Pose service URL: ${poseServiceUrl}`);
    
    try {
      const healthResponse = await axios.get(`${poseServiceUrl}/health`, { timeout: 5000 });
      console.log(`[STARTUP] ✓ Pose service is responding`);
      console.log(`[STARTUP] Pose service status:`, healthResponse.data);
    } catch (healthError: any) {
      console.warn(`[STARTUP] ⚠ Pose service health check failed (this is OK if service is still warming up)`);
      console.warn(`[STARTUP] Error:`, {
        message: healthError.message,
        code: healthError.code,
        address: healthError.address,
        port: healthError.port
      });
      console.warn(`[STARTUP] The pose service may still be loading models. This is normal.`);
      console.warn(`[STARTUP] Backend will check health when requests need it.`);
    }

    const server = app.listen(Number(PORT), '0.0.0.0', async () => {
      // Connect to MongoDB for mesh data storage
      try {
        await meshDataService.connect();
      } catch (err) {
        logger.error('Failed to connect to MongoDB', { error: err });
        console.error('Warning: MongoDB connection failed. Mesh data will not be persisted.');
      }

      // DISABLED: Redis cache for debugging mesh caching issue
      // try {
      //   await initializeRedisCache({
      //     host: process.env.REDIS_HOST || 'localhost',
      //     port: parseInt(process.env.REDIS_PORT || '6379', 10),
      //     maxMemory: process.env.REDIS_MAX_MEMORY || '256mb'
      //   });
      //   logger.info('Redis cache initialized successfully');
      // } catch (err) {
      //   logger.warn('Failed to initialize Redis cache', { error: err });
      //   console.warn('Warning: Redis cache not available. Frame caching will be disabled.');
      // }
      console.log('[STARTUP] Redis cache disabled for debugging');

      console.log(`\n========================================`);
      console.log(`🚀 Video Coaching API running on port ${PORT}`);
      console.log(`========================================\n`);

      logger.info(`🚀 Video Coaching API running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        bindAddress: '0.0.0.0',
        accessibleAt: `http://192.168.1.153:${PORT}`
      });

      logger.info('Available endpoints:', {
        service: 'video-coach-api',
        health: `GET http://0.0.0.0:${PORT}/api/health`,
        upload: `POST http://0.0.0.0:${PORT}/api/video/upload`,
        frames: `GET http://0.0.0.0:${PORT}/api/video/:videoId/frames`,
        frame: `GET http://0.0.0.0:${PORT}/api/video/:videoId/frame/:frameNumber`,
        chatSession: `POST http://0.0.0.0:${PORT}/api/chat/session`,
        getMessage: `GET http://0.0.0.0:${PORT}/api/chat/session/:sessionId`,
        addMessage: `POST http://0.0.0.0:${PORT}/api/chat/message`,
        knowledge: `GET http://0.0.0.0:${PORT}/api/knowledge/phase/:phase`,
        search: `GET http://0.0.0.0:${PORT}/api/knowledge/search?q=query`,
        meshDataList: `GET http://0.0.0.0:${PORT}/api/mesh-data/list`,
        meshDataDelete: `DELETE http://0.0.0.0:${PORT}/api/mesh-data/:videoId`
      });
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down gracefully...');
      
      // Shutdown process pool
      if (poolManager) {
        await poolManager.shutdown();
      }
      
      await meshDataService.disconnect();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n\nShutting down gracefully (SIGTERM)...');
      
      // Shutdown process pool
      if (poolManager) {
        await poolManager.shutdown();
      }
      
      await meshDataService.disconnect();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err}`, { error: err });
    process.exit(1);
  }
}

startServer();

export default app;
