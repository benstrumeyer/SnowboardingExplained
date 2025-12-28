/**
 * Video Upload with Pose Extraction API
 * POST /api/upload-video-with-pose
 * 
 * FLOW:
 * 1. Extract frames from video using ffmpeg
 * 2. Convert frames to base64
 * 3. Send to pose service /pose/hybrid endpoint (expects base64 images)
 * 4. Store results in jobStore keyed by videoId
 * 
 * TODO: Requires 'next' and 'formidable' modules which are not available in Express backend.
 * Commenting out for now to unblock Docker build.
 * 
 * Missing dependencies:
 * - next
 * - formidable
 */

// COMMENTED OUT - Missing dependencies
/*
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { FrameExtractionService } from '../src/services/frameExtraction';
import { detectPoseHybridBatch } from '../src/services/pythonPoseService';
import { jobStore, MeshSequence, generateVideoId } from './jobStore';

// ... rest of implementation commented out ...
*/
