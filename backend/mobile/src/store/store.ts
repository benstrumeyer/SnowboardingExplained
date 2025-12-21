import { configureStore } from '@reduxjs/toolkit';
import phaseReducer from './slices/phaseSlice';
import videoReducer from './slices/videoSlice';
import analysisReducer from './slices/analysisSlice';
import perfectPhasesReducer from './slices/perfectPhasesSlice';

export const store = configureStore({
  reducer: {
    phase: phaseReducer,
    video: videoReducer,
    analysis: analysisReducer,
    perfectPhases: perfectPhasesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
