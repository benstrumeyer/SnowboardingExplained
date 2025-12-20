import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTotalFrames, nextFrame, previousFrame } from '../store/slices/analysisSlice';
import { poseAnalysisService } from '../services/poseAnalysisService';
import { GazeIndicator } from '../components/GazeIndicator';
import { RotationAxisIndicator } from '../components/RotationAxisIndicator';
import { PhaseIndicatorOverlay } from '../components/PhaseIndicatorOverlay';
import { SummaryPanel } from '../components/SummaryPanel';
import { FrameNavigationControls } from '../components/FrameNavigationControls';

interface TrickAnalysisScreenProps {
  frameUris: string[];
  phaseName: string;
  phaseIndex: number;
}

const PHASE_NAMES = [
  'Setup Carve',
  'Wind Up',
  'Snap',
  'Takeoff',
  'Air',
  'Landing',
];

const PHASE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
];

export const TrickAnalysisScreen: React.FC<TrickAnalysisScreenProps> = ({
  frameUris,
  phaseName,
  phaseIndex,
}) => {
  const dispatch = useAppDispatch();
  const currentFrameIndex = useAppSelector((state) => state.analysis.currentFrameIndex);
  const poseData = useAppSelector((state) => state.analysis.currentPoseData);
  const isLoadingPose = useAppSelector((state) => state.analysis.isLoadingPose);
  const phaseReasoning = useAppSelector((state) => state.analysis.phaseReasoning);

  const screenWidth = Dimensions.get('window').width;
  const frameHeight = (screenWidth * 9) / 16;

  useEffect(() => {
    if (frameUris.length > 0) {
      dispatch(setTotalFrames(frameUris.length));
    }
  }, [frameUris.length, dispatch]);

  useEffect(() => {
    if (frameUris.length > 0) {
      loadFrameData();
    }
  }, [currentFrameIndex, frameUris]);

  const loadFrameData = async () => {
    if (frameUris.length === 0) return;
    try {
      const frameUri = frameUris[currentFrameIndex];
      await poseAnalysisService.analyzePose(
        frameUri,
        currentFrameIndex
      );
    } catch (error) {
      console.error('Failed to load frame data:', error);
    }
  };

  const handleBack = () => {
    if (currentFrameIndex > 0) {
      dispatch(previousFrame());
    }
  };

  const handleNext = () => {
    if (currentFrameIndex < frameUris.length - 1) {
      dispatch(nextFrame());
    }
  };

  // Show placeholder if no frames
  if (frameUris.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>No Frames Available</Text>
          <Text style={styles.placeholderText}>
            Upload a video and mark phases to analyze frames
          </Text>
        </View>
      </View>
    );
  }

  const framePosition = `Frame ${currentFrameIndex + 1} of ${frameUris.length}`;
  const isShowRotationAxis = phaseIndex === 3; // Takeoff phase

  return (
    <View style={styles.container}>
      {/* Frame Display with Overlays */}
      <View style={[styles.frameContainer, { height: frameHeight }]}>
        {isLoadingPose ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading frame...</Text>
          </View>
        ) : (
          <>
            {/* Frame Image */}
            <Image
              source={{ uri: frameUris[currentFrameIndex] }}
              style={styles.frameImage}
            />

            {/* Skeleton Overlay */}
            {poseData && (
              <View style={styles.overlayContainer}>
                <GazeIndicator poseData={poseData} />
              </View>
            )}

            {/* Rotation Axis Indicator (Takeoff only) */}
            {poseData && isShowRotationAxis && (
              <View style={styles.overlayContainer}>
                <RotationAxisIndicator poseData={poseData} isVisible={true} />
              </View>
            )}

            {/* Phase Indicator Overlay */}
            <PhaseIndicatorOverlay
              phaseName={phaseName}
              phaseColor={PHASE_COLORS[phaseIndex]}
              framePosition={framePosition}
              isVisible={true}
            />
          </>
        )}
      </View>

      {/* Summary Panel */}
      {poseData && (
        <View style={styles.summaryContainer}>
          <SummaryPanel
            poseData={poseData}
            phaseReasoning={phaseReasoning}
            mcpToolOutputs={[]}
          />
        </View>
      )}

      {/* Frame Navigation Controls */}
      <FrameNavigationControls
        currentFrame={currentFrameIndex}
        totalFrames={frameUris.length}
        onBack={handleBack}
        onNext={handleNext}
        isLoading={isLoadingPose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  frameContainer: {
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  frameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  summaryContainer: {
    flex: 1,
    maxHeight: 300,
    backgroundColor: '#f5f5f5',
  },
});
