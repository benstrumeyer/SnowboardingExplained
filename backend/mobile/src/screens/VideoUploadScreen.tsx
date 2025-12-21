import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../store/hooks';
import { setVideoUri, setFrameUris } from '../store/slices/videoSlice';

interface VideoUploadScreenProps {
  onVideoSelected: () => void;
}

export interface VideoMetadata {
  duration: number;
  size: number;
  format: string;
  filename: string;
}

export const VideoUploadScreen: React.FC<VideoUploadScreenProps> = ({
  onVideoSelected,
}) => {
  const dispatch = useAppDispatch();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickVideo = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const filename = asset.fileName || 'video.mp4';

        // Extract metadata
        const metadata: VideoMetadata = {
          duration: asset.duration ? asset.duration / 1000 : 0, // Convert ms to seconds
          size: asset.fileSize || 0,
          format: filename.split('.').pop() || 'mp4',
          filename,
        };

        setSelectedVideo(uri);
        setVideoMetadata(metadata);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video. Please try again.');
      console.error('Video pick error:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractFramesFromVideo = async (videoUri: string, duration: number) => {
    try {
      // For mobile, we'll create placeholder frame URIs
      // In a real app, you'd use a native module to extract actual frames
      const frameCount = Math.min(Math.ceil(duration * 2), 20); // 2 FPS, max 20 frames
      const frameUris: string[] = [];

      for (let i = 0; i < frameCount; i++) {
        // Use the video URI with a timestamp parameter
        // This is a workaround - in production you'd extract actual frames
        frameUris.push(videoUri);
      }

      return frameUris;
    } catch (error) {
      console.error('Failed to extract frames:', error);
      return [videoUri]; // Fallback to single frame
    }
  };

  const handleContinue = async () => {
    if (selectedVideo && videoMetadata) {
      try {
        setLoading(true);
        
        // Extract frames from video
        const frameUris = await extractFramesFromVideo(
          selectedVideo,
          videoMetadata.duration
        );

        // Store in Redux
        dispatch(setVideoUri(selectedVideo));
        dispatch(setFrameUris(frameUris));

        Alert.alert('Success', 'Video uploaded! You can now mark phases.', [
          { text: 'OK', onPress: onVideoSelected }
        ]);
      } catch (error) {
        Alert.alert('Error', 'Failed to process video. Please try again.');
        console.error('Video processing error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Video</Text>
        <Text style={styles.subtitle}>
          Select a video to analyze trick form
        </Text>

        {!selectedVideo ? (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickVideo}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Text style={styles.uploadButtonText}>📁 Choose Video</Text>
                <Text style={styles.uploadButtonSubtext}>
                  MP4, MOV, or WebM
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedContainer}>
            <View style={styles.metadataContainer}>
              <Text style={styles.metadataLabel}>File Name</Text>
              <Text style={styles.metadataValue}>
                {videoMetadata?.filename}
              </Text>

              <Text style={styles.metadataLabel}>File Size</Text>
              <Text style={styles.metadataValue}>
                {formatFileSize(videoMetadata?.size || 0)}
              </Text>

              <Text style={styles.metadataLabel}>Format</Text>
              <Text style={styles.metadataValue}>
                {videoMetadata?.format.toUpperCase()}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={handlePickVideo}
              >
                <Text style={styles.changeButtonText}>Change Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  metadataContainer: {
    marginBottom: 20,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  metadataValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
