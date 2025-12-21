import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Video, AVPlaybackStatus } from 'expo-av';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentFrame, setIsPlaying, setVideoMetadata } from '../store/slices/videoSlice';

interface VideoPlayerProps {
  onFrameExtracted?: (frameNumber: number, timestamp: number) => void;
}

export interface VideoPlayerMetadata {
  duration: number;
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  onFrameExtracted,
}) => {
  const dispatch = useAppDispatch();
  const videoUri = useAppSelector((state) => state.video.videoUri);
  const isPlaying = useAppSelector((state) => state.video.isPlaying);
  const metadata = useAppSelector((state) => state.video.metadata);
  
  const videoRef = useRef<Video>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fps, setFps] = useState(30);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);

  const screenWidth = Dimensions.get('window').width;
  const videoHeight_ = (screenWidth * 9) / 16;

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsLoading(false);

      if (status.didJustFinish) {
        dispatch(setIsPlaying(false));
      }

      // Extract metadata on first load
      if (videoWidth === 0 && status.videoDetails) {
        const width = status.videoDetails.width || 1920;
        const height = status.videoDetails.height || 1080;
        const estimatedFps = 30;
        const totalFrames = Math.floor(
          ((status.durationMillis || 0) / 1000) * estimatedFps
        );

        setVideoWidth(width);
        setVideoHeight(height);
        setFps(estimatedFps);

        dispatch(setVideoMetadata({
          duration: status.durationMillis || 0,
          fps: estimatedFps,
          totalFrames,
          width,
          height,
          filename: 'video',
          format: 'mp4',
        }));
      }
    }
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      dispatch(setIsPlaying(!isPlaying));
    }
  };

  const handleSeek = async (position: number) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(position);
      const frameNumber = Math.floor((position / 1000) * fps);
      dispatch(setCurrentFrame({ frame: frameNumber, timestamp: position }));
      onFrameExtracted?.(frameNumber, position);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentFrame = Math.floor((currentTime / 1000) * fps);
  const totalFrames = Math.floor((duration / 1000) * fps);
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.videoContainer, { height: videoHeight_ }]}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
          resizeMode="contain"
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>/</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.frameContainer}>
          <Text style={styles.frameText}>
            Frame {currentFrame} / {totalFrames}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>

      <TouchableOpacity
        style={styles.scrubber}
        onPress={(e) => {
          const { locationX } = e.nativeEvent;
          const percentage = locationX / screenWidth;
          const newPosition = percentage * duration;
          handleSeek(newPosition);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.scrubberTrack}>
          <View
            style={[
              styles.scrubberThumb,
              { left: `${progress * 100}%` },
            ]}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {videoWidth > 0 && `${videoWidth}x${videoHeight} • ${fps} FPS`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  videoContainer: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  frameContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  frameText: {
    color: '#999',
    fontSize: 12,
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  scrubber: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    position: 'relative',
  },
  scrubberThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginTop: -4,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoText: {
    color: '#999',
    fontSize: 12,
  },
});
