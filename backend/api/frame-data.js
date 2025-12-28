/**
 * Frame Data API Routes
 * GET /api/video/{videoId}/frame/{frameIndex}
 * Returns frame data with optional compression
 */
import express from 'express';
import zlib from 'zlib';
import { promisify } from 'util';
import logger from '../src/logger';
import { getFrameDataService } from '../src/services/frameDataService';
const gzip = promisify(zlib.gzip);
const router = express.Router();
/**
 * GET /api/video/:videoId/frame/:frameIndex
 * Query params:
 *   - includeOverlay: boolean (default: true)
 *   - includeOriginal: boolean (default: true)
 *   - includeMesh: boolean (default: true)
 *   - compress: boolean (default: true)
 */
router.get('/video/:videoId/frame/:frameIndex', async (req, res) => {
    try {
        const { videoId, frameIndex } = req.params;
        const { includeOverlay = 'true', includeOriginal = 'true', includeMesh = 'true', compress = 'true' } = req.query;
        // Parse query parameters
        const frameIdx = parseInt(frameIndex, 10);
        if (isNaN(frameIdx) || frameIdx < 0) {
            return res.status(400).json({ error: 'Invalid frameIndex' });
        }
        const options = {
            includeOverlay: includeOverlay === 'true',
            includeOriginal: includeOriginal === 'true',
            includeMesh: includeMesh === 'true'
        };
        // Get frame data service
        const frameDataService = getFrameDataService();
        // Retrieve frame data
        const frameData = await frameDataService.getFrame(videoId, frameIdx, options);
        // Prepare response
        let responseData = JSON.stringify(frameData);
        // Apply compression if requested
        if (compress === 'true') {
            try {
                const compressed = await gzip(responseData);
                res.set('Content-Encoding', 'gzip');
                res.set('Content-Type', 'application/json');
                return res.send(compressed);
            }
            catch (error) {
                logger.warn('Compression failed, sending uncompressed:', error);
            }
        }
        // Send uncompressed response
        res.set('Content-Type', 'application/json');
        res.send(responseData);
    }
    catch (error) {
        logger.error('Error retrieving frame data:', error);
        if (error instanceof Error && error.message.includes('No frame data found')) {
            return res.status(404).json({ error: 'Frame not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/video/:videoId/preload
 * Preload next N frames into cache
 * Body: { startFrame: number, count: number }
 */
router.post('/video/:videoId/preload', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { startFrame = 0, count = 10 } = req.body;
        if (!Number.isInteger(startFrame) || !Number.isInteger(count) || count <= 0) {
            return res.status(400).json({ error: 'Invalid startFrame or count' });
        }
        const frameDataService = getFrameDataService();
        await frameDataService.preloadFrames(videoId, startFrame, count);
        res.json({ success: true, message: `Preloaded ${count} frames` });
    }
    catch (error) {
        logger.error('Error preloading frames:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * DELETE /api/video/:videoId/cache
 * Clear cache for a video or specific frame
 * Query params:
 *   - frameIndex: number (optional, clears specific frame if provided)
 */
router.delete('/video/:videoId/cache', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { frameIndex } = req.query;
        const frameDataService = getFrameDataService();
        if (frameIndex) {
            const frameIdx = parseInt(frameIndex, 10);
            if (isNaN(frameIdx)) {
                return res.status(400).json({ error: 'Invalid frameIndex' });
            }
            await frameDataService.clearCache(videoId, frameIdx);
            res.json({ success: true, message: `Cleared cache for frame ${frameIdx}` });
        }
        else {
            await frameDataService.clearCache(videoId);
            res.json({ success: true, message: `Cleared all cache for ${videoId}` });
        }
    }
    catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=frame-data.js.map