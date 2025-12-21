import { createAsyncThunk } from '@reduxjs/toolkit';
import { poseAnalysisService, PoseData } from '../../services/poseAnalysisService';

export interface AnalyzePosePayload {
  frameUri: string;
  frameNumber: number;
}

export const analyzePose = createAsyncThunk(
  'video/analyzePose',
  async (payload: AnalyzePosePayload, { rejectWithValue }) => {
    try {
      const poseData = await poseAnalysisService.analyzePose(
        payload.frameUri,
        payload.frameNumber
      );
      return poseData as PoseData;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to analyze pose'
      );
    }
  }
);
