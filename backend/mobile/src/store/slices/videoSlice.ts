import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VideoMetadata {
  duration: number;
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
  filename: string;
  format: string;
}

export interface VideoState {
  videoUri: string | null;
  metadata: VideoMetadata | null;
  currentFrame: number;
  currentTimestamp: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  frameUris: string[];
}

const initialState: VideoState = {
  videoUri: null,
  metadata: null,
  currentFrame: 0,
  currentTimestamp: 0,
  isPlaying: false,
  isLoading: false,
  error: null,
  frameUris: [],
};

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setVideoUri: (state, action: PayloadAction<string>) => {
      state.videoUri = action.payload;
      state.currentFrame = 0;
      state.currentTimestamp = 0;
      state.isPlaying = false;
    },

    setCurrentFrame: (
      state,
      action: PayloadAction<{ frame: number; timestamp: number }>
    ) => {
      state.currentFrame = action.payload.frame;
      state.currentTimestamp = action.payload.timestamp;
    },

    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },

    clearVideo: (state) => {
      state.videoUri = null;
      state.metadata = null;
      state.currentFrame = 0;
      state.currentTimestamp = 0;
      state.isPlaying = false;
      state.error = null;
    },

    setVideoMetadata: (state, action: PayloadAction<VideoMetadata>) => {
      state.metadata = action.payload;
    },

    setFrameUris: (state, action: PayloadAction<string[]>) => {
      state.frameUris = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setVideoUri, (state, action) => {
        state.videoUri = action.payload;
        state.currentFrame = 0;
        state.currentTimestamp = 0;
        state.isPlaying = false;
      });
  },
});

export const {
  setVideoUri,
  setCurrentFrame,
  setIsPlaying,
  clearVideo,
  setVideoMetadata,
  setFrameUris,
} = videoSlice.actions;

export default videoSlice.reducer;
