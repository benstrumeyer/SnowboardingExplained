import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface VideoDetails {
  videoId: string;
  title: string;
  duration: number;
  url: string;
  thumbnail: string;
  tips: string[];
}

interface VideoState {
  selectedVideo: VideoDetails | null;
  nextVideo: VideoDetails | null;
  prevVideo: VideoDetails | null;
  selectedVideoIndex: number;
  isModalOpen: boolean;
  carouselVideos: VideoDetails[];
}

const initialState: VideoState = {
  selectedVideo: null,
  nextVideo: null,
  prevVideo: null,
  selectedVideoIndex: -1,
  isModalOpen: false,
  carouselVideos: [],
};

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setSelectedVideo: (state, action: PayloadAction<VideoDetails | null>) => {
      state.selectedVideo = action.payload;
    },
    setNextVideo: (state, action: PayloadAction<VideoDetails | null>) => {
      state.nextVideo = action.payload;
    },
    setPrevVideo: (state, action: PayloadAction<VideoDetails | null>) => {
      state.prevVideo = action.payload;
    },
    setSelectedVideoIndex: (state, action: PayloadAction<number>) => {
      state.selectedVideoIndex = action.payload;
    },
    setIsModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
    },
    setCarouselVideos: (state, action: PayloadAction<VideoDetails[]>) => {
      state.carouselVideos = action.payload;
    },
    setCarouselState: (
      state,
      action: PayloadAction<{
        selectedVideo: VideoDetails | null;
        nextVideo: VideoDetails | null;
        prevVideo: VideoDetails | null;
        selectedVideoIndex: number;
      }>
    ) => {
      state.selectedVideo = action.payload.selectedVideo;
      state.nextVideo = action.payload.nextVideo;
      state.prevVideo = action.payload.prevVideo;
      state.selectedVideoIndex = action.payload.selectedVideoIndex;
    },
    resetVideoState: (state) => {
      state.selectedVideo = null;
      state.nextVideo = null;
      state.prevVideo = null;
      state.selectedVideoIndex = -1;
      state.isModalOpen = false;
      state.carouselVideos = [];
    },
  },
});

export const {
  setSelectedVideo,
  setNextVideo,
  setPrevVideo,
  setSelectedVideoIndex,
  setIsModalOpen,
  setCarouselVideos,
  setCarouselState,
  resetVideoState,
} = videoSlice.actions;

export default videoSlice.reducer;
