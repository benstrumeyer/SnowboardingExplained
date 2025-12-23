/**
 * List all mesh data from MongoDB
 * GET /api/mesh-data/list
 */

import { Request, Response } from 'express';
import { meshDataService } from '../src/services/meshDataService';
import { ApiResponse } from '../src/types';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }

  try {
    await meshDataService.connect();
    const models = await meshDataService.getAllMeshData();
    
    res.json({
      success: true,
      data: models,
      timestamp: new Date().toISOString()
    } as ApiResponse<any>);

  } catch (err: any) {
    console.error('[MESH-DATA-LIST] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to list mesh data',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
}
