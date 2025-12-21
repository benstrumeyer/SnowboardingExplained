import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchPerfectPhases,
  fetchPerfectPhaseById,
  deletePerfectPhase,
} from '../thunks/perfectPhasesThunks';

export interface PerfectPhase {
  id: string;
  trickName: string;
  phaseName: string;
  stance: string;
  dateCreated: string;
  frameCount: number;
  averageConfidence: number;
}

export interface PerfectPhasesState {
  phases: PerfectPhase[];
  filteredPhases: PerfectPhase[];
  selectedPhase: PerfectPhase | null;
  searchQuery: string;
  selectedPhaseFilter: string | null;
  selectedStanceFilter: string | null;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
  submitError: string | null;
}

const initialState: PerfectPhasesState = {
  phases: [],
  filteredPhases: [],
  selectedPhase: null,
  searchQuery: '',
  selectedPhaseFilter: null,
  selectedStanceFilter: null,
  isLoading: false,
  error: null,
  isSubmitting: false,
  submitError: null,
};

const perfectPhasesSlice = createSlice({
  name: 'perfectPhases',
  initialState,
  reducers: {
    setFilteredPhases: (state, action: PayloadAction<PerfectPhase[]>) => {
      state.filteredPhases = action.payload;
    },

    setSelectedPhase: (state, action: PayloadAction<PerfectPhase | null>) => {
      state.selectedPhase = action.payload;
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    setSelectedPhaseFilter: (state, action: PayloadAction<string | null>) => {
      state.selectedPhaseFilter = action.payload;
    },

    setSelectedStanceFilter: (state, action: PayloadAction<string | null>) => {
      state.selectedStanceFilter = action.payload;
    },

    addPhase: (state, action: PayloadAction<PerfectPhase>) => {
      state.phases.push(action.payload);
      state.filteredPhases.push(action.payload);
    },

    clearFilters: (state) => {
      state.searchQuery = '';
      state.selectedPhaseFilter = null;
      state.selectedStanceFilter = null;
      state.filteredPhases = state.phases;
    },

    clearPerfectPhases: (state) => {
      state.phases = [];
      state.filteredPhases = [];
      state.selectedPhase = null;
      state.searchQuery = '';
      state.selectedPhaseFilter = null;
      state.selectedStanceFilter = null;
      state.error = null;
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all perfect phases
      .addCase(fetchPerfectPhases.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPerfectPhases.fulfilled, (state, action) => {
        state.isLoading = false;
        state.phases = action.payload;
        state.filteredPhases = action.payload;
      })
      .addCase(fetchPerfectPhases.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single perfect phase
      .addCase(fetchPerfectPhaseById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPerfectPhaseById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPhase = action.payload;
      })
      .addCase(fetchPerfectPhaseById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete perfect phase
      .addCase(deletePerfectPhase.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(deletePerfectPhase.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.phases = state.phases.filter((p) => p.id !== action.payload);
        state.filteredPhases = state.filteredPhases.filter(
          (p) => p.id !== action.payload
        );
      })
      .addCase(deletePerfectPhase.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload as string;
      });
  },
});

export const {
  setFilteredPhases,
  setSelectedPhase,
  setSearchQuery,
  setSelectedPhaseFilter,
  setSelectedStanceFilter,
  addPhase,
  clearFilters,
  clearPerfectPhases,
} = perfectPhasesSlice.actions;

export default perfectPhasesSlice.reducer;
