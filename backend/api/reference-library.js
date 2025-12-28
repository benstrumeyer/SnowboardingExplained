/**
 * Reference Library API Endpoint
 * Manage coach reference videos and extract signals
 */
import { Router } from 'express';
import { createReferenceSignalSet, getReferenceSignalSet, getReferenceSignalSetsForPhase, getBestReferenceSignalSet, getReferenceSignalSetsForTrick, getReferenceSignalSetsByCoach, listAllReferenceSignalSets, updateReferenceSignalSet, deleteReferenceSignalSet, getReferenceLibraryStats, searchReferenceSignalSetsByTags, getReferenceSignalSetsWithMinQuality, } from '../src/services/referenceLibraryService';
const router = Router();
/**
 * POST /api/reference-library/create
 * Create a new reference signal set from a coach video
 *
 * Body:
 * {
 *   trick: string,
 *   phase: Phase,
 *   stance: 'regular' | 'goofy',
 *   sourceVideoId: string,
 *   startFrame: number,
 *   endFrame: number,
 *   coachName: string,
 *   description: string,
 *   quality: 1-5,
 *   notes?: string,
 *   tags?: string[]
 * }
 */
router.post('/reference-library/create', async (req, res) => {
    try {
        const { trick, phase, stance, sourceVideoId, startFrame, endFrame, coachName, description, quality, notes, tags, } = req.body;
        if (!trick ||
            !phase ||
            !stance ||
            !sourceVideoId ||
            startFrame === undefined ||
            endFrame === undefined ||
            !coachName ||
            !description ||
            !quality) {
            return res.status(400).json({
                error: 'Missing required fields',
            });
        }
        const referenceSet = await createReferenceSignalSet(trick, phase, stance, sourceVideoId, startFrame, endFrame, coachName, description, quality, notes, tags);
        res.json({
            success: true,
            data: referenceSet,
        });
    }
    catch (error) {
        console.error('Error creating reference signal set:', error);
        res.status(500).json({
            error: 'Failed to create reference signal set',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/:id
 * Get a reference signal set by ID
 */
router.get('/reference-library/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const referenceSet = await getReferenceSignalSet(id);
        if (!referenceSet) {
            return res.status(404).json({
                error: `Reference signal set ${id} not found`,
            });
        }
        res.json({
            success: true,
            data: referenceSet,
        });
    }
    catch (error) {
        console.error('Error fetching reference signal set:', error);
        res.status(500).json({
            error: 'Failed to fetch reference signal set',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/trick/:trick/phase/:phase
 * Get all reference signal sets for a trick and phase
 */
router.get('/reference-library/trick/:trick/phase/:phase', async (req, res) => {
    try {
        const { trick, phase } = req.params;
        const { stance } = req.query;
        const referenceSets = await getReferenceSignalSetsForPhase(trick, phase, stance);
        res.json({
            success: true,
            data: referenceSets,
        });
    }
    catch (error) {
        console.error('Error fetching reference signal sets:', error);
        res.status(500).json({
            error: 'Failed to fetch reference signal sets',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/best/:trick/:phase/:stance
 * Get best reference signal set for a trick and phase
 */
router.get('/reference-library/best/:trick/:phase/:stance', async (req, res) => {
    try {
        const { trick, phase, stance } = req.params;
        if (!['regular', 'goofy'].includes(stance)) {
            return res.status(400).json({
                error: 'Invalid stance. Must be "regular" or "goofy"',
            });
        }
        const referenceSet = await getBestReferenceSignalSet(trick, phase, stance);
        if (!referenceSet) {
            return res.status(404).json({
                error: `No reference signal set found for ${trick} ${phase} ${stance}`,
            });
        }
        res.json({
            success: true,
            data: referenceSet,
        });
    }
    catch (error) {
        console.error('Error fetching best reference signal set:', error);
        res.status(500).json({
            error: 'Failed to fetch best reference signal set',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/trick/:trick
 * Get all reference signal sets for a trick
 */
router.get('/reference-library/trick/:trick', async (req, res) => {
    try {
        const { trick } = req.params;
        const referenceSets = await getReferenceSignalSetsForTrick(trick);
        res.json({
            success: true,
            data: referenceSets,
        });
    }
    catch (error) {
        console.error('Error fetching reference signal sets:', error);
        res.status(500).json({
            error: 'Failed to fetch reference signal sets',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/coach/:coachName
 * Get all reference signal sets by a coach
 */
router.get('/reference-library/coach/:coachName', async (req, res) => {
    try {
        const { coachName } = req.params;
        const referenceSets = await getReferenceSignalSetsByCoach(coachName);
        res.json({
            success: true,
            data: referenceSets,
        });
    }
    catch (error) {
        console.error('Error fetching reference signal sets:', error);
        res.status(500).json({
            error: 'Failed to fetch reference signal sets',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/list
 * List all reference signal sets
 */
router.get('/reference-library/list', async (req, res) => {
    try {
        const referenceSets = await listAllReferenceSignalSets();
        res.json({
            success: true,
            data: referenceSets,
        });
    }
    catch (error) {
        console.error('Error listing reference signal sets:', error);
        res.status(500).json({
            error: 'Failed to list reference signal sets',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/stats
 * Get statistics about the reference library
 */
router.get('/reference-library/stats', async (req, res) => {
    try {
        const stats = await getReferenceLibraryStats();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Error fetching reference library stats:', error);
        res.status(500).json({
            error: 'Failed to fetch reference library stats',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/search/tags
 * Search reference signal sets by tags
 *
 * Query: tags=tag1,tag2,tag3
 */
router.get('/reference-library/search/tags', async (req, res) => {
    try {
        const { tags } = req.query;
        if (!tags || typeof tags !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid tags query parameter',
            });
        }
        const tagList = tags.split(',').map((t) => t.trim());
        const referenceSets = await searchReferenceSignalSetsByTags(tagList);
        res.json({
            success: true,
            data: referenceSets,
        });
    }
    catch (error) {
        console.error('Error searching reference signal sets:', error);
        res.status(500).json({
            error: 'Failed to search reference signal sets',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/reference-library/quality/:minQuality
 * Get reference signal sets with minimum quality
 */
router.get('/reference-library/quality/:minQuality', async (req, res) => {
    try {
        const { minQuality } = req.params;
        const quality = parseInt(minQuality);
        if (isNaN(quality) || quality < 1 || quality > 5) {
            return res.status(400).json({
                error: 'Invalid quality. Must be between 1 and 5',
            });
        }
        const referenceSets = await getReferenceSignalSetsWithMinQuality(quality);
        res.json({
            success: true,
            data: referenceSets,
        });
    }
    catch (error) {
        console.error('Error fetching reference signal sets:', error);
        res.status(500).json({
            error: 'Failed to fetch reference signal sets',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * PUT /api/reference-library/:id
 * Update a reference signal set
 */
router.put('/reference-library/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updated = await updateReferenceSignalSet(id, updates);
        if (!updated) {
            return res.status(404).json({
                error: `Reference signal set ${id} not found`,
            });
        }
        res.json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        console.error('Error updating reference signal set:', error);
        res.status(500).json({
            error: 'Failed to update reference signal set',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * DELETE /api/reference-library/:id
 * Delete a reference signal set
 */
router.delete('/reference-library/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await deleteReferenceSignalSet(id);
        if (!deleted) {
            return res.status(404).json({
                error: `Reference signal set ${id} not found`,
            });
        }
        res.json({
            success: true,
            message: `Reference signal set ${id} deleted`,
        });
    }
    catch (error) {
        console.error('Error deleting reference signal set:', error);
        res.status(500).json({
            error: 'Failed to delete reference signal set',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
//# sourceMappingURL=reference-library.js.map