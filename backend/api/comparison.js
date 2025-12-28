/**
 * Comparison API Endpoint
 * POST /api/comparison - Compare rider video to reference video
 */
import { Router } from 'express';
import { db } from '../src/db/connection';
import { compareVideos, formatComparisonForAPI, } from '../src/services/comparisonService';
import { castToVideoAnalysis } from '../src/utils/mongoTypeGuards';
const router = Router();
/**
 * POST /api/comparison
 * Compare rider video to reference video
 *
 * Body:
 * {
 *   riderVideoId: string,
 *   referenceVideoId: string
 * }
 */
router.post('/comparison', async (req, res) => {
    try {
        const { riderVideoId, referenceVideoId } = req.body;
        if (!riderVideoId || !referenceVideoId) {
            return res.status(400).json({
                error: 'Missing riderVideoId or referenceVideoId',
            });
        }
        // Fetch rider analysis
        const riderDoc = await db
            .collection('videoAnalyses')
            .findOne({ videoId: riderVideoId });
        const riderAnalysis = castToVideoAnalysis(riderDoc);
        if (!riderAnalysis) {
            return res.status(404).json({
                error: `Rider video ${riderVideoId} not found`,
            });
        }
        // Fetch reference analysis
        const referenceDoc = await db
            .collection('videoAnalyses')
            .findOne({ videoId: referenceVideoId });
        const referenceAnalysis = castToVideoAnalysis(referenceDoc);
        if (!referenceAnalysis) {
            return res.status(404).json({
                error: `Reference video ${referenceVideoId} not found`,
            });
        }
        // Perform comparison
        const comparisonResult = await compareVideos(riderAnalysis, referenceAnalysis);
        // Format for API response
        const formattedResult = formatComparisonForAPI(comparisonResult);
        res.json(formattedResult);
    }
    catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
            error: 'Failed to compare videos',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/comparison/:riderVideoId/:referenceVideoId
 * Compare rider video to reference video (GET variant)
 */
router.get('/comparison/:riderVideoId/:referenceVideoId', async (req, res) => {
    try {
        const { riderVideoId, referenceVideoId } = req.params;
        // Fetch rider analysis
        const riderDoc = await db
            .collection('videoAnalyses')
            .findOne({ videoId: riderVideoId });
        const riderAnalysis = castToVideoAnalysis(riderDoc);
        if (!riderAnalysis) {
            return res.status(404).json({
                error: `Rider video ${riderVideoId} not found`,
            });
        }
        // Fetch reference analysis
        const referenceDoc = await db
            .collection('videoAnalyses')
            .findOne({ videoId: referenceVideoId });
        const referenceAnalysis = castToVideoAnalysis(referenceDoc);
        if (!referenceAnalysis) {
            return res.status(404).json({
                error: `Reference video ${referenceVideoId} not found`,
            });
        }
        // Perform comparison
        const comparisonResult = await compareVideos(riderAnalysis, referenceAnalysis);
        // Format for API response
        const formattedResult = formatComparisonForAPI(comparisonResult);
        res.json(formattedResult);
    }
    catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
            error: 'Failed to compare videos',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
//# sourceMappingURL=comparison.js.map