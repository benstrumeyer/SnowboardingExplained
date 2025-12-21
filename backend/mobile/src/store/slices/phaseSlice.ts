import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { submitPerfectPhase, validatePhaseData } from '../thunks/phaseThunks';

export interface MarkedPhase {
  phaseIndex: number;
  phaseName: string;
  startFrame: number;
  endFrame: number;
  startTimestamp: number;
  endTimestamp: number;
  duration: number;
}

export interface PhaseState {
  markedPhases: MarkedPhase[];
  currentPhaseIndex: number;
  tempStartFrame: number | null;
  tempStartTimestamp: number | null;
  selectedPhaseIndex: number | null;
  isSubmitting: boolean;
  submitError: string | null;
  isValidating: boolean;
  validationError: string | null;
}

const PHASE_NAMES = [
  'setupCarve',
  'windUp',
  'snap',
  'takeoff',
  'air',
  'landing',
];

const initialState: PhaseState = {
  markedPhases: [],
  currentPhaseIndex: 0,
  tempStartFrame: null,
  tempStartTimestamp: null,
  selectedPhaseIndex: null,
  isSubmitting: false,
  submitError: null,
  isValidating: false,
  validationError: null,
};

const phaseSlice = createSlice({
  name: 'phase',
  initialState,
  reducers: {
    markPhaseStart: (
      state,
      action: PayloadAction<{ frameNumber: number; timestamp: number }>
    ) => {
      state.tempStartFrame = action.payload.frameNumber;
      state.tempStartTimestamp = action.payload.timestamp;
    },

    markPhaseEnd: (
      state,
      action: PayloadAction<{ frameNumber: number; timestamp: number }>
    ) => {
      if (
        state.tempStartFrame === null ||
        state.tempStartTimestamp === null
      ) {
        return;
      }

      if (action.payload.frameNumber <= state.tempStartFrame) {
        return;
      }

      const phaseName = PHASE_NAMES[state.currentPhaseIndex];
      const duration = action.payload.timestamp - state.tempStartTimestamp;

      const newPhase: MarkedPhase = {
        phaseIndex: state.currentPhaseIndex,
        phaseName,
        startFrame: state.tempStartFrame,
        endFrame: action.payload.frameNumber,
        startTimestamp: state.tempStartTimestamp,
        endTimestamp: action.payload.timestamp,
        duration,
      };

      const filtered = state.markedPhases.filter(
        (p) => p.phaseIndex !== state.currentPhaseIndex
      );
      state.markedPhases = [...filtered, newPhase].sort(
        (a, b) => a.phaseIndex - b.phaseIndex
      );

      if (state.currentPhaseIndex < PHASE_NAMES.length - 1) {
        state.currentPhaseIndex += 1;
      }

      state.tempStartFrame = null;
      state.tempStartTimestamp = null;
    },

    editPhase: (
      state,
      action: PayloadAction<{
        phaseIndex: number;
        startFrame: number;
        endFrame: number;
      }>
    ) => {
      if (action.payload.startFrame >= action.payload.endFrame) {
        return;
      }

      const phase = state.markedPhases.find(
        (p) => p.phaseIndex === action.payload.phaseIndex
      );
      if (phase) {
        phase.startFrame = action.payload.startFrame;
        phase.endFrame = action.payload.endFrame;
        phase.duration = (action.payload.endFrame - action.payload.startFrame) / 30;
      }
    },

    deletePhase: (state, action: PayloadAction<number>) => {
      state.markedPhases = state.markedPhases.filter(
        (p) => p.phaseIndex !== action.payload
      );
    },

    clearAllPhases: (state) => {
      state.markedPhases = [];
      state.currentPhaseIndex = 0;
      state.tempStartFrame = null;
      state.tempStartTimestamp = null;
      state.selectedPhaseIndex = null;
    },

    setCurrentPhaseIndex: (state, action: PayloadAction<number>) => {
      state.currentPhaseIndex = action.payload;
    },

    setSelectedPhaseIndex: (state, action: PayloadAction<number | null>) => {
      state.selectedPhaseIndex = action.payload;
    },

    cancelPhaseStart: (state) => {
      state.tempStartFrame = null;
      state.tempStartTimestamp = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitPerfectPhase.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(submitPerfectPhase.fulfilled, (state) => {
        state.isSubmitting = false;
        state.markedPhases = [];
        state.currentPhaseIndex = 0;
      })
      .addCase(submitPerfectPhase.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload as string;
      })
      .addCase(validatePhaseData.pending, (state) => {
        state.isValidating = true;
        state.validationError = null;
      })
      .addCase(validatePhaseData.fulfilled, (state) => {
        state.isValidating = false;
      })
      .addCase(validatePhaseData.rejected, (state, action) => {
        state.isValidating = false;
        state.validationError = action.payload as string;
      });
  },
});

export const {
  markPhaseStart,
  markPhaseEnd,
  editPhase,
  deletePhase,
  clearAllPhases,
  setCurrentPhaseIndex,
  setSelectedPhaseIndex,
  cancelPhaseStart,
} = phaseSlice.actions;

export default phaseSlice.reducer;
