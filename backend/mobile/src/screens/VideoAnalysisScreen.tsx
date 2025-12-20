import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../store/hooks';
import { setVideoUri, setFrameUris } from '../store/slices/videoSlice';
import { PhaseIndicatorOverlay } from '../components/PhaseIndicatorOverlay';
import { AnalysisPanel, FrameAnalysisData, AnalysisLogData } from '../components/AnalysisPanel';
import { config } from '../config';

interface VideoMetadata {
  duration: number;
  size: number;
  format: string;
  filename: string;
}

interface PoseFrame {
  frameNumber: number;
  originalFrameNumber: number;
  timestamp: number;
  confidence: number;
  keypoints: Array<{
    name: string;
    x: number;
    y: number;
    z: number;
    x_3d: number;
    y_3d: number;
    z_3d: number;
    confidence: number;
  }>;
  joints3D: number[][];
  jointAngles: {
    left_knee?: number;
    right_knee?: number;
    left_hip?: number;
    right_hip?: number;
    spine?: number;
    [key: string]: number | undefined;
  };
  has3D: boolean;
  meshRendered: boolean;
  imageBase64?: string; // data:image/jpeg;base64,...
}

interface AnalysisResult {
  output_path: string;
  total_frames: number;
  processed_frames: number;
  fps: number;
  resolution: [number, number];
  processing_time_seconds: number;
  output_size_mb: number;
  frame_acceptance: Array<{
    frame_index: number;
    has_mesh: boolean;
    original_frame_number: number;
    timestamp: number;
  }>;
  pose_timeline: PoseFrame[];
  video_duration: number;
}

const PHASE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
];

export const VideoAnalysisScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  
  // Full analysis state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const frameHeight = (screenWidth * 9) / 16;

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

        const metadata: VideoMetadata = {
          duration: asset.duration ? asset.duration / 1000 : 0,
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

  const uploadAndAnalyzeVideo = async () => {
    if (!selectedVideo || !videoMetadata) return;

    try {
      setAnalyzing(true);
      setAnalysisProgress('Uploading video...');

      console.log(`[UPLOAD_START] Starting video upload`);

      const formData = new FormData();
      formData.append('video', {
        uri: selectedVideo,
        type: 'video/mp4',
        name: videoMetadata.filename,
      } as any);
      formData.append('max_frames', '15');

      const uploadUrl = `${config.apiUrl}/api/video/process_async`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      const newJobId = uploadData.job_id;

      if (!newJobId) {
        throw new Error('No job ID returned from server');
      }

      console.log(`[UPLOAD] ✓ Job created: ${newJobId}`);
      setJobId(newJobId);
      setAnalysisProgress('Processing video... (this may take a few minutes)');

      await pollJobStatus(newJobId);
    } catch (error: any) {
      console.error(`[UPLOAD] ✗ Error:`, error);
      Alert.alert('Error', `Failed to analyze video: ${error.message}`);
      setAnalyzing(false);
      setJobId(null);
    }
  };

  const pollJobStatus = async (pollJobId: string) => {
    const maxAttempts = 120;
    let attempts = 0;
    let isComplete = false;

    return new Promise<void>((resolve, reject) => {
      const poll = async () => {
        if (isComplete || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            reject(new Error('Analysis timeout'));
          }
          return;
        }

        try {
          const statusUrl = `${config.apiUrl}/api/video/job_status/${pollJobId}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch(statusUrl, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
          }

          const data = await response.json();
          console.log(`[POLL] Job status: ${data.status}`);

          if (data.status === 'complete') {
            isComplete = true;
            setAnalysisProgress('Processing complete!');
            
            const result: AnalysisResult = data.result || {};
            console.log(`[POLL] ✓ Analysis complete with ${result.pose_timeline?.length || 0} frames`);
            
            // Store full analysis result
            setAnalysisResult(result);
            setCurrentFrameIndex(0);
            
            // Generate frame URIs for the output video frames
            const frameCount = result.pose_timeline?.length || 0;
            const frameUriList = Array.from({ length: frameCount }, () => 
              `${config.apiUrl}/api/video/output/${pollJobId}`
            );
            
            dispatch(setVideoUri(`${config.apiUrl}/api/video/output/${pollJobId}`));
            dispatch(setFrameUris(frameUriList));

            setAnalyzing(false);
            setSelectedVideo(null);
            setVideoMetadata(null);
            
            resolve();
          } else if (data.status === 'error') {
            isComplete = true;
            reject(new Error(data.error || 'Job failed'));
          } else if (data.status === 'processing') {
            setAnalysisProgress(`Processing... ${Math.round(data.elapsed_time || 0)}s elapsed`);
            attempts++;
            setTimeout(poll, 5000);
          } else {
            attempts++;
            setTimeout(poll, 5000);
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            attempts++;
            setTimeout(poll, 5000);
          } else {
            isComplete = true;
            reject(error);
          }
        }
      };

      poll();
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePreviousFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const handleNextFrame = () => {
    const maxFrames = analysisResult?.pose_timeline?.length || 0;
    if (currentFrameIndex < maxFrames - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setCurrentFrameIndex(0);
    setJobId(null);
    dispatch(setFrameUris([]));
    setSelectedVideo(null);
    setVideoMetadata(null);
  };

  // Get current frame data
  const currentFrame = analysisResult?.pose_timeline?.[currentFrameIndex];
  
  // Build frame analysis data for AnalysisPanel
  const currentFrameAnalysis: FrameAnalysisData | null = currentFrame ? {
    frameNumber: currentFrame.frameNumber,
    timestamp: currentFrame.timestamp,
    phase: 'analysis', // TODO: Add phase detection
    toolResults: {
      jointAngles: currentFrame.jointAngles,
      has3D: currentFrame.has3D,
      meshRendered: currentFrame.meshRendered,
      keypointCount: currentFrame.keypoints?.length || 0,
    },
    confidence: currentFrame.confidence,
  } : null;

  // Build analysis log data
  const analysisLog: AnalysisLogData | null = analysisResult ? {
    mcpToolCalls: [],
    stateTransitions: [],
    phaseAnalysis: [],
    summary: `Processed ${analysisResult.processed_frames} frames in ${analysisResult.processing_time_seconds}s`,
    totalProcessingTimeMs: analysisResult.processing_time_seconds * 1000,
  } : null;

  // Show upload screen if no analysis yet
  if (!analysisResult) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Video Analysis</Text>
          <Text style={styles.subtitle}>
            Upload a video to analyze trick form with 3D pose detection
          </Text>

          {analyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.analyzingText}>{analysisProgress}</Text>
            </View>
          ) : !selectedVideo ? (
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
                  <Text style={styles.uploadButtonSubtext}>MP4, MOV, or WebM</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedContainer}>
              <View style={styles.metadataContainer}>
                <Text style={styles.metadataLabel}>File Name</Text>
                <Text style={styles.metadataValue}>{videoMetadata?.filename}</Text>

                <Text style={styles.metadataLabel}>File Size</Text>
                <Text style={styles.metadataValue}>{formatFileSize(videoMetadata?.size || 0)}</Text>

                <Text style={styles.metadataLabel}>Duration</Text>
                <Text style={styles.metadataValue}>{Math.round(videoMetadata?.duration || 0)}s</Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.changeButton} onPress={handlePickVideo}>
                  <Text style={styles.changeButtonText}>Change Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={uploadAndAnalyzeVideo}
                  disabled={loading}
                >
                  <Text style={styles.analyzeButtonText}>Analyze</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // Show analysis results
  const totalFrames = analysisResult.pose_timeline?.length || 0;
  const framePosition = `Frame ${currentFrameIndex + 1} of ${totalFrames}`;
  const currentFrameImageUri = currentFrame?.imageBase64 || '';

  return (
    <ScrollView style={styles.analysisContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={resetAnalysis}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frame Analysis</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Frame Display */}
      <View style={[styles.frameContainer, { height: frameHeight }]}>
        {currentFrameImageUri ? (
          <Image
            source={{ uri: currentFrameImageUri }}
            style={styles.frameImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.noFrameContainer}>
            <Text style={styles.noFrameText}>No frame image available</Text>
          </View>
        )}
        
        <PhaseIndicatorOverlay
          phaseName="Analysis"
          phaseColor={PHASE_COLORS[currentFrameIndex % PHASE_COLORS.length]}
          framePosition={framePosition}
          isVisible={true}
        />
      </View>

      {/* Frame Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentFrameIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePreviousFrame}
          disabled={currentFrameIndex === 0}
        >
          <Text style={styles.navButtonText}>← Previous</Text>
        </TouchableOpacity>

        <View style={styles.frameCounter}>
          <Text style={styles.frameCounterText}>{currentFrameIndex + 1} / {totalFrames}</Text>
        </View>

        <TouchableOpacity
          style={[styles.navButton, currentFrameIndex === totalFrames - 1 && styles.navButtonDisabled]}
          onPress={handleNextFrame}
          disabled={currentFrameIndex === totalFrames - 1}
        >
          <Text style={styles.navButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Joint Angles Display */}
      {currentFrame && (
        <View style={styles.jointAnglesContainer}>
          <Text style={styles.sectionTitle}>Joint Angles</Text>
          <View style={styles.angleGrid}>
            {Object.entries(currentFrame.jointAngles || {}).map(([name, value]) => (
              <View key={name} style={styles.angleItem}>
                <Text style={styles.angleLabel}>{name.replace('_', ' ')}</Text>
                <Text style={styles.angleValue}>{typeof value === 'number' ? `${value.toFixed(0)}°` : '-'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Frame Info */}
      {currentFrame && (
        <View style={styles.frameInfoContainer}>
          <Text style={styles.sectionTitle}>Frame Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timestamp:</Text>
            <Text style={styles.infoValue}>{currentFrame.timestamp.toFixed(2)}s</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Keypoints:</Text>
            <Text style={styles.infoValue}>{currentFrame.keypoints?.length || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>3D Data:</Text>
            <Text style={styles.infoValue}>{currentFrame.has3D ? '✓ Yes' : '✗ No'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mesh Rendered:</Text>
            <Text style={styles.infoValue}>{currentFrame.meshRendered ? '✓ Yes' : '✗ No'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confidence:</Text>
            <Text style={styles.infoValue}>{(currentFrame.confidence * 100).toFixed(0)}%</Text>
          </View>
        </View>
      )}

      {/* Analysis Panel */}
      <View style={styles.analysisPanelContainer}>
        <AnalysisPanel
          currentFrameAnalysis={currentFrameAnalysis}
          analysisLog={analysisLog}
        />
      </View>

      {/* Processing Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Processing Summary</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Frames:</Text>
          <Text style={styles.infoValue}>{analysisResult.processed_frames}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>FPS:</Text>
          <Text style={styles.infoValue}>{analysisResult.fps.toFixed(1)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Resolution:</Text>
          <Text style={styles.infoValue}>{analysisResult.resolution[0]}x{analysisResult.resolution[1]}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Processing Time:</Text>
          <Text style={styles.infoValue}>{analysisResult.processing_time_seconds.toFixed(1)}s</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Output Size:</Text>
          <Text style={styles.infoValue}>{analysisResult.output_size_mb} MB</Text>
        </View>
      </View>

      {/* Upload New Video Button */}
      <TouchableOpacity style={styles.uploadNewButton} onPress={resetAnalysis}>
        <Text style={styles.uploadNewButtonText}>📁 Upload New Video</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  // Upload screen styles
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  analyzingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  selectedContainer: {
    width: '100%',
    maxWidth: 400,
  },
  metadataContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
  metadataValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: '#00FF00',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '700',
  },

  // Analysis results screen styles
  analysisContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  frameContainer: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  noFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  noFrameText: {
    color: '#666',
    fontSize: 14,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
  },
  navButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  frameCounter: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  frameCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  jointAnglesContainer: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  angleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  angleItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  angleLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  angleValue: {
    fontSize: 14,
    color: '#00FF00',
    fontWeight: '600',
  },
  frameInfoContainer: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
  },
  infoValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  analysisPanelContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryContainer: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  uploadNewButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadNewButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default VideoAnalysisScreen;
