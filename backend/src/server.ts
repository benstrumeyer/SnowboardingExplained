import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from './logger';
import { FrameExtractionService } from './services/frameExtraction';
import { TrickDetectionService } from './services/trickDetection';
import { LLMTrickDetectionService } from './services/llmTrickDetection';
import { ChatService } from './services/chatService';
import { KnowledgeBaseService } from './services/knowledgeBase';
import { ApiResponse } from './types';
// New imports for Python pose service
import { detectPose, detectPoseParallel, detectPoseHybrid, detectPoseHybridBatch, checkPoseServiceHealth, PoseFrame, HybridPoseFrame } from './services/pythonPoseService';
import { AnalysisLogBuilder, analyzeFrame, AnalysisLog, FrameAnalysis } from './services/analysisLogService';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });
// Also load from .env as fallback
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration for ngrok tunnel and local development
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '';
  
  // Allow ngrok tunnel, localhost, and local IPs
  const allowedOrigins = [
    'https://uncongenial-nonobstetrically-norene.ngrok-free.dev',
    'http://localhost:3000',
    'http://localhost:3001',
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
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

    // Get frame data for LLM analysis
    logger.info(`Preparing frames for LLM analysis`);
    const framesForLLM = frameResult.frames.slice(0, 10).map(f => ({
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
    const fps = parseInt(req.body.fps) || 4; // Default 4 FPS

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

    // Limit to 10 frames for analysis
    const framesToAnalyze = frameResult.frames.slice(0, 10);
    
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

    let imageBase64 = null;
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      imageBase64 = imageBuffer.toString('base64');
    }

    let metadata = null;
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

// Initialize services and start server
async function startServer() {
  try {
    // Initialize knowledge base
    await KnowledgeBaseService.initialize();

    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`🚀 Video Coaching API running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        bindAddress: '0.0.0.0',
        accessibleAt: 'http://192.168.1.153:3001'
      });
      logger.info('Available endpoints:', {
        health: `GET http://0.0.0.0:${PORT}/api/health`,
        upload: `POST http://0.0.0.0:${PORT}/api/video/upload`,
        frames: `GET http://0.0.0.0:${PORT}/api/video/:videoId/frames`,
        frame: `GET http://0.0.0.0:${PORT}/api/video/:videoId/frame/:frameNumber`,
        chatSession: `POST http://0.0.0.0:${PORT}/api/chat/session`,
        getMessage: `GET http://0.0.0.0:${PORT}/api/chat/session/:sessionId`,
        addMessage: `POST http://0.0.0.0:${PORT}/api/chat/message`,
        knowledge: `GET http://0.0.0.0:${PORT}/api/knowledge/phase/:phase`,
        search: `GET http://0.0.0.0:${PORT}/api/knowledge/search?q=query`
      });
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err}`, { error: err });
    process.exit(1);
  }
}

startServer();

export default app;
