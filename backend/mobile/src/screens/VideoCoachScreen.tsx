import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { config } from '../config';
import { FrameCarousel, FrameData } from '../components/FrameCarousel';
import { AnalysisPanel, FrameAnalysisData, AnalysisLogData } from '../components/AnalysisPanel';

interface AnalysisResult {
  videoId: string;
  filename: string;
  frameCount: number;
  duration: number;
  trick: {
    name: string;
    rotationDirection: string;
    rotationCount: number;
    difficulty: string;
    confidence: number;
    description: string;
  };
  frames: Array<{
    frameNumber: number;
    timestamp: number;
    imagePath: string;
  }>;
}

interface PoseTestResult {
  videoId: string;
  frameIndex: number;
  totalFrames: number;
  timestamp: number;
  poseConfidence: number;
  keypointsDetected: number;
  totalKeypoints: number;
  visualization: string; // base64 image
  keypoints: Array<{
    name: string;
    x: number;
    y: number;
    confidence: number;
  }>;
}

// New interface for full pose analysis with Python service
interface FullPoseAnalysisResult {
  videoId: string;
  totalFrames: number;
  analyzedFrames: number;
  duration: number;
  visualizations: FrameData[];
  frameAnalyses: FrameAnalysisData[];
  analysisLog: AnalysisLogData;
  poseData: Array<{
    frameNumber: number;
    keypointCount: number;
    processingTimeMs: number;
    error?: string;
    keypoints: Array<{
      name: string;
      x: number;
      y: number;
      confidence: number;
    }>;
  }>;
}

export const VideoCoachScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [poseTest, setPoseTest] = useState<PoseTestResult | null>(null);
  const [fullPoseAnalysis, setFullPoseAnalysis] = useState<FullPoseAnalysisResult | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickVideo = async () => {
    try {
      console.log('[VideoCoach] Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1
      });

      console.log('[VideoCoach] Picker result:', result);
      console.log('[VideoCoach] Canceled:', result.canceled);
      console.log('[VideoCoach] Assets:', result.assets);

      if (!result.canceled && result.assets[0]) {
        console.log('[VideoCoach] Video selected:', result.assets[0].uri);
        uploadVideo(result.assets[0].uri);
      } else {
        console.log('[VideoCoach] Video selection canceled');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Picker error:', err);
      console.error('[VideoCoach] Error message:', err.message);
      setError(`Failed to pick video: ${err.message || err}`);
    }
  };

  const uploadVideo = async (videoUri: string) => {
    try {
      console.log('[VideoCoach] Starting upload...');
      console.log('[VideoCoach] Video URI:', videoUri);
      
      setLoading(true);
      setError(null);

      console.log('[VideoCoach] Creating FormData...');
      const formData = new FormData();
      
      // React Native FormData expects a file object with uri, type, and name
      const videoFile = {
        uri: videoUri,
        type: 'video/mp4',
        name: 'trick-video.mp4'
      };
      
      console.log('[VideoCoach] Video file object:', videoFile);
      formData.append('video', videoFile as any);
      console.log('[VideoCoach] FormData prepared');

      const uploadUrl = `${config.apiUrl}/api/video/upload`;
      console.log('[VideoCoach] Sending to backend at:', uploadUrl);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('[VideoCoach] Upload response status:', uploadResponse.status);
      console.log('[VideoCoach] Upload response ok:', uploadResponse.ok);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[VideoCoach] Upload error response:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const result = await uploadResponse.json();
      console.log('[VideoCoach] Upload result:', result);

      if (result.success) {
        console.log('[VideoCoach] Analysis successful:', result.data);
        setAnalysis(result.data);
        setSelectedFrame(0);
      } else {
        console.error('[VideoCoach] Upload returned error:', result.error);
        setError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Upload error:', err);
      console.error('[VideoCoach] Error message:', err.message);
      console.error('[VideoCoach] Error stack:', err.stack);
      setError(`Upload error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Test pose endpoint - no LLM calls, just pose visualization
  const testPose = async () => {
    try {
      console.log('[VideoCoach] Opening image picker for pose test...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[VideoCoach] Video selected for pose test:', result.assets[0].uri);
        await uploadForPoseTest(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('[VideoCoach] Pose test picker error:', err);
      setError(`Failed to pick video: ${err.message || err}`);
    }
  };

  const uploadForPoseTest = async (videoUri: string) => {
    try {
      console.log('[VideoCoach] Starting pose test upload...');
      setLoading(true);
      setError(null);
      setPoseTest(null);
      setAnalysis(null);

      const formData = new FormData();
      const videoFile = {
        uri: videoUri,
        type: 'video/mp4',
        name: 'trick-video.mp4'
      };
      formData.append('video', videoFile as any);

      const uploadUrl = `${config.apiUrl}/api/video/test-pose`;
      console.log('[VideoCoach] Sending to pose test endpoint:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      console.log('[VideoCoach] Pose test response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pose test failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[VideoCoach] Pose test result:', result);

      if (result.success) {
        setPoseTest(result.data);
      } else {
        setError(result.error || 'Pose test failed');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Pose test error:', err);
      setError(`Pose test error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Full pose analysis with Python MediaPipe service
  const analyzePose = async () => {
    try {
      console.log('[VideoCoach] Opening image picker for full pose analysis...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[VideoCoach] Video selected for pose analysis:', result.assets[0].uri);
        await uploadForPoseAnalysis(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('[VideoCoach] Pose analysis picker error:', err);
      setError(`Failed to pick video: ${err.message || err}`);
    }
  };

  const uploadForPoseAnalysis = async (videoUri: string) => {
    try {
      console.log('[VideoCoach] Starting full pose analysis upload...');
      setLoading(true);
      setError(null);
      setPoseTest(null);
      setAnalysis(null);
      setFullPoseAnalysis(null);
      setCurrentFrameIndex(0);

      const formData = new FormData();
      const videoFile = {
        uri: videoUri,
        type: 'video/mp4',
        name: 'trick-video.mp4'
      };
      formData.append('video', videoFile as any);
      formData.append('fps', '4'); // 4 frames per second

      const uploadUrl = `${config.apiUrl}/api/video/analyze-pose`;
      console.log('[VideoCoach] Sending to pose analysis endpoint:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      console.log('[VideoCoach] Pose analysis response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pose analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[VideoCoach] Pose analysis result:', result);

      if (result.success) {
        setFullPoseAnalysis(result.data);
      } else {
        setError(result.error || 'Pose analysis failed');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Pose analysis error:', err);
      setError(`Pose analysis error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFrameChange = (frameIndex: number) => {
    setCurrentFrameIndex(frameIndex);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Analyzing video...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={pickVideo}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show full pose analysis results (NEW - with Python MediaPipe)
  if (fullPoseAnalysis) {
    const currentAnalysis = fullPoseAnalysis.frameAnalyses[currentFrameIndex] || null;
    
    return (
      <ScrollView style={styles.darkContainer}>
        <View style={styles.header}>
          <Text style={styles.darkTitle}>🎿 Pose Analysis</Text>
          <Text style={styles.darkSubtitle}>
            {fullPoseAnalysis.analyzedFrames} frames analyzed • {fullPoseAnalysis.duration.toFixed(1)}s video
          </Text>
        </View>

        {/* Frame Carousel */}
        <FrameCarousel
          frames={fullPoseAnalysis.visualizations}
          onFrameChange={handleFrameChange}
          loading={false}
        />

        {/* Analysis Panel */}
        <AnalysisPanel
          currentFrameAnalysis={currentAnalysis}
          analysisLog={fullPoseAnalysis.analysisLog}
        />

        {/* Stats Summary */}
        <View style={styles.darkStatsContainer}>
          <View style={styles.stat}>
            <Text style={styles.darkStatLabel}>Total Frames</Text>
            <Text style={styles.darkStatValue}>{fullPoseAnalysis.totalFrames}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.darkStatLabel}>Analyzed</Text>
            <Text style={styles.darkStatValue}>{fullPoseAnalysis.analyzedFrames}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.darkStatLabel}>Tool Calls</Text>
            <Text style={styles.darkStatValue}>{fullPoseAnalysis.analysisLog.mcpToolCalls.length}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.analyzeButton} onPress={analyzePose}>
          <Text style={styles.buttonText}>Analyze Another Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => setFullPoseAnalysis(null)}>
          <Text style={styles.buttonText}>Back to Main</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Show pose test results (old single-frame test)
  if (poseTest) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pose Test Results</Text>
          <Text style={styles.subtitle}>Frame {poseTest.frameIndex + 1} of {poseTest.totalFrames}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Keypoints</Text>
            <Text style={styles.statValue}>{poseTest.keypointsDetected}/{poseTest.totalKeypoints}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Confidence</Text>
            <Text style={styles.statValue}>{(poseTest.poseConfidence * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Timestamp</Text>
            <Text style={styles.statValue}>{poseTest.timestamp.toFixed(2)}s</Text>
          </View>
        </View>

        <View style={styles.frameContainer}>
          <Text style={styles.frameTitle}>Pose Visualization</Text>
          <Image
            source={{ uri: poseTest.visualization }}
            style={styles.frameImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.keypointsList}>
          <Text style={styles.frameTitle}>Detected Keypoints</Text>
          {poseTest.keypoints.filter(k => k.confidence > 0.3).map((kp, idx) => (
            <Text key={idx} style={styles.keypointText}>
              {kp.name}: ({kp.x}, {kp.y}) - {(kp.confidence * 100).toFixed(0)}%
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.testButton} onPress={testPose}>
          <Text style={styles.buttonText}>Test Another Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setPoseTest(null)}>
          <Text style={styles.buttonText}>Back to Main</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.darkContainer}>
        <Text style={styles.darkTitle}>🎿 Video Trick Coach</Text>
        <Text style={styles.darkSubtitle}>Upload a snowboarding video to analyze your trick</Text>
        
        <TouchableOpacity style={styles.analyzeButton} onPress={analyzePose}>
          <Text style={styles.buttonText}>🔬 Full Pose Analysis (Python MediaPipe)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testPose}>
          <Text style={styles.buttonText}>🧪 Quick Pose Test (single frame)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={pickVideo}>
          <Text style={styles.buttonText}>📊 Full Analysis (uses LLM)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{analysis.trick.name}</Text>
        <Text style={styles.subtitle}>{analysis.trick.description}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Rotations</Text>
          <Text style={styles.statValue}>{analysis.trick.rotationCount.toFixed(1)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Direction</Text>
          <Text style={styles.statValue}>{analysis.trick.rotationDirection}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Difficulty</Text>
          <Text style={styles.statValue}>{analysis.trick.difficulty}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Confidence</Text>
          <Text style={styles.statValue}>{(analysis.trick.confidence * 100).toFixed(0)}%</Text>
        </View>
      </View>

      <View style={styles.frameContainer}>
        <Text style={styles.frameTitle}>Frame {selectedFrame + 1} / {analysis.frames.length}</Text>
        {analysis.frames[selectedFrame] && (
          <Image
            source={{ uri: analysis.frames[selectedFrame].imagePath }}
            style={styles.frameImage}
          />
        )}
      </View>

      <View style={styles.frameSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {analysis.frames.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.frameThumbnail,
                selectedFrame === idx && styles.frameThumbnailActive
              ]}
              onPress={() => setSelectedFrame(idx)}
            >
              <Text style={styles.frameThumbnailText}>{idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.button} onPress={pickVideo}>
        <Text style={styles.buttonText}>Analyze Another Video</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  darkContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0d0d1a'
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  darkTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20
  },
  darkSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 20
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8
  },
  darkStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 12
  },
  stat: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5
  },
  darkStatLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  darkStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  frameContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden'
  },
  frameTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 10,
    backgroundColor: '#f0f0f0'
  },
  frameImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#000'
  },
  frameSelector: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10
  },
  frameThumbnail: {
    width: 50,
    height: 50,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  frameThumbnailActive: {
    backgroundColor: '#1976d2',
    borderWidth: 2,
    borderColor: '#0d47a1'
  },
  frameThumbnailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333'
  },
  button: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  testButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  analyzeButton: {
    backgroundColor: '#00BFFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  backButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  keypointsList: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20
  },
  keypointText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace'
  }
});
