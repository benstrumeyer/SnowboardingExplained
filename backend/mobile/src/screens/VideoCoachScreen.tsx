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

// 4D-Humans result interface
interface FourDHumansResult {
  videoId: string;
  totalFrames: number;
  analyzedFrames: number;
  has3dFrames: number;
  duration: number;
  visualizations: Array<{
    frameNumber: number;
    timestamp: number;
    imageBase64: string;
  }>;
  poseData: Array<{
    frameNumber: number;
    timestamp: number;
    keypointCount: number;
    processingTimeMs: number;
    modelVersion: string;
    has3d: boolean;
    jointAngles3d?: {
      left_knee?: number;
      right_knee?: number;
      left_hip?: number;
      right_hip?: number;
      spine?: number;
    };
    error?: string;
    keypoints: Array<{
      name: string;
      x: number;
      y: number;
      z?: number;
      confidence: number;
    }>;
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

// Pose service status
interface PoseServiceStatus {
  status: 'ready' | 'warming_up' | 'not_ready' | 'offline';
  models: {
    hmr2: 'loaded' | 'not_loaded';
    vitdet: 'loaded' | 'not_loaded';
  };
  ready: boolean;
}

export const VideoCoachScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [poseTest, setPoseTest] = useState<PoseTestResult | null>(null);
  const [fullPoseAnalysis, setFullPoseAnalysis] = useState<FullPoseAnalysisResult | null>(null);
  const [fourDHumansResult, set4DHumansResult] = useState<FourDHumansResult | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [poseServiceStatus, setPoseServiceStatus] = useState<PoseServiceStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [processedVideoPath, setProcessedVideoPath] = useState<string | null>(null);
  const [processedVideoInfo, setProcessedVideoInfo] = useState<any>(null);

  // Check pose service status on mount and periodically
  React.useEffect(() => {
    const checkPoseService = async () => {
      try {
        // Use the pose service URL directly (WSL)
        const response = await fetch(`${config.apiUrl}/api/pose/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          setPoseServiceStatus(data);
        } else {
          setPoseServiceStatus({
            status: 'offline',
            models: { hmr2: 'not_loaded', vitdet: 'not_loaded' },
            ready: false
          });
        }
      } catch (err) {
        console.log('[VideoCoach] Pose service check failed:', err);
        setPoseServiceStatus({
          status: 'offline',
          models: { hmr2: 'not_loaded', vitdet: 'not_loaded' },
          ready: false
        });
      } finally {
        setCheckingStatus(false);
      }
    };

    // Check immediately
    checkPoseService();

    // Poll every 5 seconds while not ready
    const interval = setInterval(() => {
      if (!poseServiceStatus?.ready) {
        checkPoseService();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [poseServiceStatus?.ready]);

  const pickVideo = async () => {
    try {
      console.log('[VideoCoach] Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
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
        console.log('[VideoCoach] Visualizations:', result.data?.visualizations);
        console.log('[VideoCoach] First viz:', result.data?.visualizations?.[0]);
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
        mediaTypes: ['videos'],
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
        mediaTypes: ['videos'],
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

  // 4D-Humans analysis
  const analyze4DHumans = async () => {
    try {
      console.log('[VideoCoach] Opening picker for 4D-Humans analysis...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[VideoCoach] Video selected for 4D-Humans:', result.assets[0].uri);
        await uploadFor4DHumans(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('[VideoCoach] 4D-Humans picker error:', err);
      setError(`Failed to pick video: ${err.message || err}`);
    }
  };

  // Full video mesh overlay processing
  const processFullVideo = async () => {
    try {
      console.log('[VideoCoach] Opening picker for full video processing...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[VideoCoach] Video selected for full processing:', result.assets[0].uri);
        await uploadForFullVideoProcessing(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('[VideoCoach] Full video picker error:', err);
      setError(`Failed to pick video: ${err.message || err}`);
    }
  };

  const uploadForFullVideoProcessing = async (videoUri: string) => {
    try {
      console.log('[VideoCoach] Starting full video processing...');
      setVideoProcessing(true);
      setError(null);
      setProcessedVideoPath(null);
      setProcessedVideoInfo(null);

      const formData = new FormData();
      const videoFile = {
        uri: videoUri,
        type: 'video/mp4',
        name: 'trick-video.mp4'
      };
      formData.append('video', videoFile as any);

      const uploadUrl = `${config.apiUrl}/api/video/process_video`;
      console.log('[VideoCoach] Sending to full video endpoint:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      console.log('[VideoCoach] Full video response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Full video processing failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[VideoCoach] Full video result:', result);

      if (result.status === 'success') {
        setProcessedVideoPath(result.output_path);
        setProcessedVideoInfo(result);
      } else {
        setError(result.error || 'Full video processing failed');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Full video processing error:', err);
      setError(`Full video processing error: ${err.message || err}`);
    } finally {
      setVideoProcessing(false);
    }
  };

  const uploadFor4DHumans = async (videoUri: string) => {
    try {
      console.log('[VideoCoach] Starting 4D-Humans upload...');
      setLoading(true);
      setError(null);
      setPoseTest(null);
      setAnalysis(null);
      setFullPoseAnalysis(null);
      set4DHumansResult(null);
      setCurrentFrameIndex(0);

      const formData = new FormData();
      const videoFile = {
        uri: videoUri,
        type: 'video/mp4',
        name: 'trick-video.mp4'
      };
      formData.append('video', videoFile as any);
      formData.append('fps', '2'); // 2 FPS for 4D-Humans

      const uploadUrl = `${config.apiUrl}/api/video/analyze-4d`;
      console.log('[VideoCoach] Sending to 4D-Humans endpoint:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      console.log('[VideoCoach] 4D-Humans response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`4D-Humans analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[VideoCoach] 4D-Humans result:', result);
      console.log('[VideoCoach] 4D-Humans visualizations:', result.data?.visualizations);
      console.log('[VideoCoach] 4D-Humans first viz:', result.data?.visualizations?.[0]);

      if (result.success) {
        set4DHumansResult(result.data);
        setCurrentFrameIndex(0);
      } else {
        setError(result.error || '4D-Humans analysis failed');
      }
    } catch (err: any) {
      console.error('[VideoCoach] 4D-Humans error:', err);
      setError(`4D-Humans error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
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

  // Show 4D-Humans results with frame carousel
  if (fourDHumansResult) {
    const currentPose = fourDHumansResult.poseData[currentFrameIndex];
    const currentViz = fourDHumansResult.visualizations[currentFrameIndex];
    
    console.log('[VideoCoach] 4D-Humans render - currentViz keys:', currentViz ? Object.keys(currentViz) : 'null');
    console.log('[VideoCoach] 4D-Humans render - imageBase64 length:', currentViz?.imageBase64?.length || 0);
    console.log('[VideoCoach] 4D-Humans render - visualizations count:', fourDHumansResult.visualizations.length);
    
    return (
      <ScrollView style={styles.darkContainer}>
        <View style={styles.header}>
          <Text style={styles.darkTitle}>🧍 4D-Humans 3D Pose</Text>
          <Text style={styles.darkSubtitle}>
            {fourDHumansResult.has3dFrames}/{fourDHumansResult.analyzedFrames} frames with 3D • {fourDHumansResult.duration.toFixed(1)}s video
          </Text>
        </View>

        {/* Frame Display */}
        <View style={styles.frameContainer}>
          <Text style={styles.frameTitle}>
            Frame {currentFrameIndex + 1} of {fourDHumansResult.analyzedFrames}
          </Text>
          {currentViz ? (
            <>
              <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                Image size: {currentViz.imageBase64?.length || 0} bytes
              </Text>
              {currentViz.imageBase64 ? (
                <Image
                  source={{ uri: currentViz.imageBase64 }}
                  style={styles.frameImage}
                  resizeMode="contain"
                  onLoad={() => console.log('[VideoCoach] Image loaded successfully')}
                  onError={(err) => {
                    console.log('[VideoCoach] Image load error:', err);
                    console.log('[VideoCoach] Image URI starts with:', currentViz.imageBase64?.substring(0, 100));
                  }}
                />
              ) : (
                <Text style={{ color: '#f00', padding: 16 }}>imageBase64 is empty</Text>
              )}
            </>
          ) : (
            <Text style={{ color: '#f00', padding: 16 }}>No visualization available</Text>
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentFrameIndex === 0 && styles.navButtonDisabled]}
            onPress={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
            disabled={currentFrameIndex === 0}
          >
            <Text style={styles.navButtonText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.frameCounter}>
            {currentFrameIndex + 1} / {fourDHumansResult.analyzedFrames}
          </Text>
          <TouchableOpacity
            style={[styles.navButton, currentFrameIndex >= fourDHumansResult.analyzedFrames - 1 && styles.navButtonDisabled]}
            onPress={() => setCurrentFrameIndex(Math.min(fourDHumansResult.analyzedFrames - 1, currentFrameIndex + 1))}
            disabled={currentFrameIndex >= fourDHumansResult.analyzedFrames - 1}
          >
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Pose Data */}
        {currentPose && (
          <View style={styles.darkStatsContainer}>
            <View style={styles.stat}>
              <Text style={styles.darkStatLabel}>3D</Text>
              <Text style={[styles.darkStatValue, { color: currentPose.has3d ? '#4CAF50' : '#F44336' }]}>
                {currentPose.has3d ? 'YES' : 'NO'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.darkStatLabel}>Joints</Text>
              <Text style={styles.darkStatValue}>{currentPose.keypointCount}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.darkStatLabel}>Time</Text>
              <Text style={styles.darkStatValue}>{currentPose.processingTimeMs}ms</Text>
            </View>
          </View>
        )}

        {/* Joint Angles */}
        {currentPose?.jointAngles3d && (
          <View style={styles.anglesContainer}>
            <Text style={styles.anglesTitle}>3D Joint Angles</Text>
            <View style={styles.anglesGrid}>
              <Text style={styles.angleText}>L Knee: {currentPose.jointAngles3d.left_knee?.toFixed(0) || '?'}°</Text>
              <Text style={styles.angleText}>R Knee: {currentPose.jointAngles3d.right_knee?.toFixed(0) || '?'}°</Text>
              <Text style={styles.angleText}>L Hip: {currentPose.jointAngles3d.left_hip?.toFixed(0) || '?'}°</Text>
              <Text style={styles.angleText}>R Hip: {currentPose.jointAngles3d.right_hip?.toFixed(0) || '?'}°</Text>
              <Text style={styles.angleText}>Spine: {currentPose.jointAngles3d.spine?.toFixed(0) || '?'}°</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.fourDButton} onPress={analyze4DHumans}>
          <Text style={styles.buttonText}>Analyze Another Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => set4DHumansResult(null)}>
          <Text style={styles.buttonText}>Back to Main</Text>
        </TouchableOpacity>
      </ScrollView>
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

  // Render pose service status indicator
  const renderPoseServiceStatus = () => {
    if (checkingStatus) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#888" />
          <Text style={styles.statusText}>Checking pose service...</Text>
        </View>
      );
    }

    if (!poseServiceStatus) {
      return null;
    }

    const { status, models, ready } = poseServiceStatus;
    
    let statusColor = '#F44336'; // red
    let statusIcon = '❌';
    let statusMessage = 'Pose service offline';
    
    if (status === 'ready' && ready) {
      statusColor = '#4CAF50'; // green
      statusIcon = '✅';
      statusMessage = 'Ready for video analysis';
    } else if (status === 'warming_up') {
      statusColor = '#FF9800'; // orange
      statusIcon = '⏳';
      statusMessage = 'Loading models...';
    } else if (status === 'not_ready') {
      statusColor = '#FF9800'; // orange
      statusIcon = '⚠️';
      statusMessage = 'Models not loaded';
    }

    return (
      <View style={[styles.statusContainer, { borderColor: statusColor }]}>
        <Text style={styles.statusIcon}>{statusIcon}</Text>
        <View style={styles.statusTextContainer}>
          <Text style={[styles.statusMessage, { color: statusColor }]}>{statusMessage}</Text>
          <Text style={styles.statusDetails}>
            HMR2: {models.hmr2 === 'loaded' ? '✓' : '○'} | ViTDet: {models.vitdet === 'loaded' ? '✓' : '○'}
          </Text>
        </View>
        {status === 'warming_up' && (
          <ActivityIndicator size="small" color={statusColor} style={{ marginLeft: 8 }} />
        )}
      </View>
    );
  };

  // Show processed video results
  if (processedVideoPath && processedVideoInfo) {
    return (
      <ScrollView style={styles.darkContainer}>
        <View style={styles.header}>
          <Text style={styles.darkTitle}>✅ Video Processed</Text>
          <Text style={styles.darkSubtitle}>Mesh overlay applied to all frames</Text>
        </View>

        {/* Video Player */}
        <View style={styles.frameContainer}>
          <Text style={styles.frameTitle}>Processed Video</Text>
          <View style={styles.videoPlayerPlaceholder}>
            <Text style={styles.videoPlayerText}>📹</Text>
            <Text style={styles.videoPlayerLabel}>Video ready to play</Text>
            <Text style={styles.videoPlayerPath}>{processedVideoInfo.output_path}</Text>
          </View>
        </View>

        {/* Processing Stats */}
        <View style={styles.darkStatsContainer}>
          <View style={styles.stat}>
            <Text style={styles.darkStatLabel}>Total Frames</Text>
            <Text style={styles.darkStatValue}>{processedVideoInfo.total_frames}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.darkStatLabel}>Processed</Text>
            <Text style={styles.darkStatValue}>{processedVideoInfo.processed_frames}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.darkStatLabel}>FPS</Text>
            <Text style={styles.darkStatValue}>{processedVideoInfo.fps}</Text>
          </View>
        </View>

        {/* Detailed Info */}
        <View style={styles.anglesContainer}>
          <Text style={styles.anglesTitle}>Processing Details</Text>
          <View style={styles.detailsGrid}>
            <Text style={styles.detailText}>Resolution: {processedVideoInfo.resolution[0]}x{processedVideoInfo.resolution[1]}</Text>
            <Text style={styles.detailText}>Processing Time: {processedVideoInfo.processing_time_seconds}s</Text>
            <Text style={styles.detailText}>Output Size: {processedVideoInfo.output_size_mb} MB</Text>
            <Text style={styles.detailText}>Success Rate: {((processedVideoInfo.processed_frames / processedVideoInfo.total_frames) * 100).toFixed(1)}%</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.fourDButton} onPress={processFullVideo}>
          <Text style={styles.buttonText}>Process Another Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          setProcessedVideoPath(null);
          setProcessedVideoInfo(null);
        }}>
          <Text style={styles.buttonText}>Back to Main</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (videoProcessing) {
    return (
      <View style={styles.darkContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Processing full video with mesh overlay...</Text>
        <Text style={styles.loadingText}>This may take a few minutes depending on video length</Text>
      </View>
    );
  }

  if (!analysis) {
    const canAnalyze = poseServiceStatus?.ready === true;
    
    return (
      <View style={styles.darkContainer}>
        <Text style={styles.darkTitle}>🎿 Video Trick Coach</Text>
        <Text style={styles.darkSubtitle}>Upload a snowboarding video to analyze your trick</Text>
        
        {/* Pose Service Status */}
        {renderPoseServiceStatus()}
        
        <TouchableOpacity 
          style={[styles.fourDButton, !canAnalyze && styles.buttonDisabled]} 
          onPress={analyze4DHumans}
          disabled={!canAnalyze}
        >
          <Text style={styles.buttonText}>🧍 4D-Humans 3D Pose (HMR2)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.analyzeButton} onPress={analyzePose}>
          <Text style={styles.buttonText}>🔬 MediaPipe Pose Analysis</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.fullVideoButton, !canAnalyze && styles.buttonDisabled]} 
          onPress={processFullVideo}
          disabled={!canAnalyze}
        >
          <Text style={styles.buttonText}>🎬 Full Video Mesh Overlay</Text>
        </TouchableOpacity>
        
        {!canAnalyze && poseServiceStatus?.status !== 'offline' && (
          <Text style={styles.waitingText}>
            Please wait for models to load before using 4D-Humans...
          </Text>
        )}
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
  fourDButton: {
    backgroundColor: '#9C27B0',
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
  },
  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 15
  },
  navButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  navButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  frameCounter: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  anglesContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15
  },
  anglesTitle: {
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10
  },
  anglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  angleText: {
    color: 'white',
    fontSize: 13,
    width: '48%',
    marginBottom: 5
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#333'
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12
  },
  statusTextContainer: {
    flex: 1
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  statusDetails: {
    fontSize: 12,
    color: '#888'
  },
  statusText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 10
  },
  buttonDisabled: {
    opacity: 0.5
  },
  waitingText: {
    color: '#FF9800',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic'
  },
  fullVideoButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  videoPlayerPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8
  },
  videoPlayerText: {
    fontSize: 64,
    marginBottom: 10
  },
  videoPlayerLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5
  },
  videoPlayerPath: {
    color: '#888',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 10
  },
  detailsGrid: {
    flexDirection: 'column'
  },
  detailText: {
    color: 'white',
    fontSize: 13,
    marginBottom: 8
  }
});
