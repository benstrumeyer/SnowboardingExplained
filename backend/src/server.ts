import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from './logger';
import { FrameExtractionService } from './services/frameExtraction';
import { PoseEstimationService } from './services/poseEstimation';
import { TrickDetectionService } from './services/trickDetection';
import { LLMTrickDetectionService } from './services/llmTrickDetection';
import { ChatService } from './services/chatService';
import { KnowledgeBaseService } from './services/knowledgeBase';
import { ApiResponse } from './types';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });
// Also load from .env as fallback
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Video upload and analysis endpoint
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

    // Estimate poses for key frames (sample every 10 frames for speed)
    logger.info(`Starting pose estimation for ${frameResult.frames.length} frames`);
    const sampleFrames = frameResult.frames.filter((_, i) => i % 10 === 0);
    const poseResults = await PoseEstimationService.estimatePoseBatch(
      sampleFrames.map(f => ({
        path: f.imagePath,
        frameNumber: f.frameNumber,
        timestamp: f.timestamp
      }))
    );

    logger.info(`Pose estimation completed: ${poseResults.length} frames analyzed`, {
      videoId,
      framesAnalyzed: poseResults.length
    });

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
        frames: frameResult.frames.slice(0, 5) // Return first 5 frames for preview
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

// Initialize services and start server
async function startServer() {
  try {
    // Initialize knowledge base
    await KnowledgeBaseService.initialize();

    app.listen(PORT, () => {
      logger.info(`🚀 Video Coaching API running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
      logger.info('Available endpoints:', {
        health: `GET http://localhost:${PORT}/api/health`,
        upload: `POST http://localhost:${PORT}/api/video/upload`,
        frames: `GET http://localhost:${PORT}/api/video/:videoId/frames`,
        frame: `GET http://localhost:${PORT}/api/video/:videoId/frame/:frameNumber`,
        chatSession: `POST http://localhost:${PORT}/api/chat/session`,
        getMessage: `GET http://localhost:${PORT}/api/chat/session/:sessionId`,
        addMessage: `POST http://localhost:${PORT}/api/chat/message`,
        knowledge: `GET http://localhost:${PORT}/api/knowledge/phase/:phase`,
        search: `GET http://localhost:${PORT}/api/knowledge/search?q=query`
      });
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err}`, { error: err });
    process.exit(1);
  }
}

startServer();

export default app;
