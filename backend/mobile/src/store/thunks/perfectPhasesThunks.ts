import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { PerfectPhase } from '../slices/perfectPhasesSlice';

export interface FetchPerfectPhasesPayload {
  trickName?: string;
  phaseName?: string;
  stance?: string;
}

export const fetchPerfectPhases = createAsyncThunk(
  'perfectPhases/fetchPerfectPhases',
  async (filters: FetchPerfectPhasesPayload = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.trickName) params.append('trickName', filters.trickName);
      if (filters.phaseName) params.append('phaseName', filters.phaseName);
      if (filters.stance) params.append('stance', filters.stance);

      const response = await api.get(
        `/api/perfect-phases?${params.toString()}`
      );
      return response.data as PerfectPhase[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch perfect phases'
      );
    }
  }
);

export const fetchPerfectPhaseById = createAsyncThunk(
  'perfectPhases/fetchPerfectPhaseById',
  async (phaseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/perfect-phases/${phaseId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch perfect phase'
      );
    }
  }
);

export const deletePerfectPhase = createAsyncThunk(
  'perfectPhases/deletePerfectPhase',
  async (phaseId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/perfect-phases/${phaseId}`);
      return phaseId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete perfect phase'
      );
    }
  }
);
