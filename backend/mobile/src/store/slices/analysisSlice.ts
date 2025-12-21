import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { analyzePose } from '../thunks/videoThunks';
import { PoseData } from '../../services/poseAnalysisService';

export interface AnalysisState {
  currentPoseData: PoseData | null;
  phaseReasoning: string;
  mcpToolOutputs: { toolName: string; output: any }[];
  isLoadingPose: boolean;
  poseError: string | null;
  currentFrameIndex: number;
  totalFrames: number;
}

const initialState: AnalysisState = {
  currentPoseData: null,
  phaseReasoning: '',
  mcpToolOutputs: [],
  isLoadingPose: false,
  poseError: null,
  currentFrameIndex: 0,
  totalFrames: 0,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setPhaseReasoning: (state, action: PayloadAction<string>) => {
      state.phaseReasoning = action.payload;
    },

    setMcpToolOutputs: (
      state,
      action: PayloadAction<{ toolName: string; output: any }[]>
    ) => {
      state.mcpToolOutputs = action.payload;
    },

    setCurrentFrameIndex: (state, action: PayloadAction<number>) => {
      state.currentFrameIndex = action.payload;
    },

    setTotalFrames: (state, action: PayloadAction<number>) => {
      state.totalFrames = action.payload;
    },

    nextFrame: (state) => {
      if (state.currentFrameIndex < state.totalFrames - 1) {
        state.currentFrameIndex += 1;
      }
    },

    previousFrame: (state) => {
      if (state.currentFrameIndex > 0) {
        state.currentFrameIndex -= 1;
      }
    },

    clearAnalysis: (state) => {
      state.currentPoseData = null;
      state.phaseReasoning = '';
      state.mcpToolOutputs = [];
      state.isLoadingPose = false;
      state.poseError = null;
      state.currentFrameIndex = 0;
      state.totalFrames = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzePose.pending, (state) => {
        state.isLoadingPose = true;
        state.poseError = null;
      })
      .addCase(analyzePose.fulfilled, (state, action) => {
        state.isLoadingPose = false;
        state.currentPoseData = action.payload;
      })
      .addCase(analyzePose.rejected, (state, action) => {
        state.isLoadingPose = false;
        state.poseError = action.payload as string;
      });
  },
});

export const {
  setPhaseReasoning,
  setMcpToolOutputs,
  setCurrentFrameIndex,
  setTotalFrames,
  nextFrame,
  previousFrame,
  clearAnalysis,
} = analysisSlice.actions;

export default analysisSlice.reducer;
