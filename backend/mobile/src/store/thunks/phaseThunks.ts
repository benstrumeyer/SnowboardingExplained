import { createAsyncThunk } from '@reduxjs/toolkit';
import { perfectPhaseSubmissionService } from '../../services/perfectPhaseSubmissionService';
import { MarkedPhase } from '../slices/phaseSlice';

export interface SubmitPerfectPhasePayload {
  markedPhase: MarkedPhase;
  trickName: string;
  stance: string;
  videoUri: string;
}

export const submitPerfectPhase = createAsyncThunk(
  'phase/submitPerfectPhase',
  async (payload: SubmitPerfectPhasePayload, { rejectWithValue }) => {
    try {
      const result = await perfectPhaseSubmissionService.submitPerfectPhase(
        payload.markedPhase,
        payload.trickName,
        payload.stance,
        payload.videoUri
      );
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to submit perfect phase'
      );
    }
  }
);

export const validatePhaseData = createAsyncThunk(
  'phase/validatePhaseData',
  async (
    payload: {
      markedPhase: MarkedPhase;
      trickName: string;
      stance: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await perfectPhaseSubmissionService.validatePhaseData(
        payload.markedPhase,
        payload.trickName,
        payload.stance
      );
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Validation failed'
      );
    }
  }
);
