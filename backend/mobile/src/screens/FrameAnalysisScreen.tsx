import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { VideoAnalysis, PoseFrame } from '../../types/formAnalysis';

interface FrameAnalysisScreenProps {
  analysis: VideoAnalysis;
  onBack: () => void;
}

export const FrameAnalysisScreen: React.FC<FrameAnalysisScreenProps> = ({ analysis, onBack }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  const currentFrame = analysis.poseTimeline[currentFrameIndex];
  const currentPhase = getCurrentPhase(currentFrameIndex, analysis);
  const phaseExplanation = getPhaseExplanation(currentPhase, analysis, currentFrameIndex);

  function getCurrentPhase(frameIndex: number, analysis: VideoAnalysis) {
    const phases = analysis.phases.phases;
    
    if (phases.setupCarve && frameIndex >= phases.setupCarve.startFrame && frameIndex <= phases.setupCarve.endFrame) {
      return 'setupCarve';
    }
    if (phases.windUp && frameIndex >= phases.windUp.startFrame && frameIndex <= phases.windUp.endFrame) {
      return 'windUp';
    }
    if (phases.snap && frameIndex >= phases.snap.startFrame && frameIndex <= phases.snap.endFrame) {
      return 'snap';
    }
    if (phases.takeoff && frameIndex >= phases.takeoff.startFrame && frameIndex <= phases.takeoff.endFrame) {
      return 'takeoff';
    }
    if (phases.air && frameIndex >= phases.air.startFrame && frameIndex <= phases.air.endFrame) {
      return 'air';
    }
    if (phases.landing && frameIndex >= phases.landing.startFrame && frameIndex <= phases.landing.endFrame) {
      return 'landing';
    }
    return 'unknown';
  }

  function getPhaseExplanation(phase: string, analysis: VideoAnalysis, frameIndex: number) {
    const phaseData = analysis.phases.phases[phase as keyof typeof analysis.phases.phases];
    
    if (!phaseData) {
      return 'No phase data available';
    }

    const frameInPhase = frameIndex - phaseData.startFrame;
    const phaseProgress = ((frameInPhase / (phaseData.endFrame - phaseData.startFrame)) * 100).toFixed(0);

    const explanations: { [key: string]: string } = {
      setupCarve: `Setting up the carve to generate momentum. Frame ${frameInPhase} of ${phaseData.endFrame - phaseData.startFrame} (${phaseProgress}% through phase)`,
      windUp: `Winding up for the pop. Rotating body and loading the tail. Frame ${frameInPhase} of ${phaseData.endFrame - phaseData.startFrame} (${phaseProgress}% through phase)`,
      snap: `Snapping off the tail. Maximum rotation and pop power. Frame ${frameInPhase} of ${phaseData.endFrame - phaseData.startFrame} (${phaseProgress}% through phase)`,
      takeoff: `Leaving the lip. Body position and momentum transfer critical. Frame ${frameInPhase} of ${phaseData.endFrame - phaseData.startFrame} (${phaseProgress}% through phase)`,
      air: `In the air. Rotation and body control. Frame ${frameInPhase} of ${phaseData.endFrame - phaseData.startFrame} (${phaseProgress}% through phase)`,
      landing: `Landing and riding away. Absorption and control. Frame ${frameInPhase} of ${phaseData.endFrame - phaseData.startFrame} (${phaseProgress}% through phase)`,
    };

    return explanations[phase] || 'Unknown phase';
  }

  const handlePrevious = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentFrameIndex < analysis.poseTimeline.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  };

  const phaseColors: { [key: string]: string } = {
    setupCarve: '#FF6B6B',
    windUp: '#4ECDC4',
    snap: '#45B7D1',
    takeoff: '#FFA07A',
    air: '#98D8C8',
    landing: '#F7DC6F',
    unknown: '#999',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Frame Analysis</Text>
        <TouchableOpacity onPress={() => setShowLogs(!showLogs)}>
          <Text style={styles.logsButton}>📋 Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Frame Display */}
        <View style={styles.frameContainer}>
          <View style={[styles.phaseIndicator, { backgroundColor: phaseColors[currentPhase] }]}>
            <Text style={styles.phaseLabel}>{currentPhase.toUpperCase()}</Text>
          </View>
          
          <View style={styles.frameInfo}>
            <Text style={styles.frameNumber}>Frame {currentFrameIndex + 1} / {analysis.poseTimeline.length}</Text>
            <Text style={styles.timestamp}>Time: {currentFrame.timestamp.toFixed(2)}s</Text>
            <Text style={styles.confidence}>Confidence: {(currentFrame.confidence * 100).toFixed(0)}%</Text>
          </View>

          {/* Phase Explanation */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>Phase Details</Text>
            <Text style={styles.explanationText}>{phaseExplanation}</Text>
          </View>

          {/* Joint Angles */}
          <View style={styles.jointAnglesBox}>
            <Text style={styles.sectionTitle}>Joint Angles</Text>
            <View style={styles.angleGrid}>
              <View style={styles.angleItem}>
                <Text style={styles.angleLabel}>L Knee</Text>
                <Text style={styles.angleValue}>{currentFrame.jointAngles.leftKnee.toFixed(0)}°</Text>
              </View>
              <View style={styles.angleItem}>
                <Text style={styles.angleLabel}>R Knee</Text>
                <Text style={styles.angleValue}>{currentFrame.jointAngles.rightKnee.toFixed(0)}°</Text>
              </View>
              <View style={styles.angleItem}>
                <Text style={styles.angleLabel}>L Hip</Text>
                <Text style={styles.angleValue}>{currentFrame.jointAngles.leftHip.toFixed(0)}°</Text>
              </View>
              <View style={styles.angleItem}>
                <Text style={styles.angleLabel}>R Hip</Text>
                <Text style={styles.angleValue}>{currentFrame.jointAngles.rightHip.toFixed(0)}°</Text>
              </View>
              <View style={styles.angleItem}>
                <Text style={styles.angleLabel}>Spine</Text>
                <Text style={styles.angleValue}>{currentFrame.jointAngles.spine.toFixed(0)}°</Text>
              </View>
            </View>
          </View>

          {/* Logs Section */}
          {showLogs && (
            <View style={styles.logsBox}>
              <Text style={styles.sectionTitle}>Detection Logs</Text>
              <Text style={styles.logText}>
                {JSON.stringify(
                  {
                    frameIndex: currentFrameIndex,
                    phase: currentPhase,
                    timestamp: currentFrame.timestamp,
                    confidence: currentFrame.confidence,
                    jointCount: currentFrame.joints3D.length,
                    joints: currentFrame.joints3D.map(j => ({
                      name: j.name,
                      x: j.position.x.toFixed(2),
                      y: j.position.y.toFixed(2),
                      z: j.position.z.toFixed(2),
                      confidence: j.confidence.toFixed(2),
                    })),
                  },
                  null,
                  2
                )}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentFrameIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentFrameIndex === 0}
        >
          <Text style={styles.navButtonText}>← Previous</Text>
        </TouchableOpacity>

        <View style={styles.frameCounter}>
          <Text style={styles.frameCounterText}>
            {currentFrameIndex + 1} / {analysis.poseTimeline.length}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.navButton, currentFrameIndex === analysis.poseTimeline.length - 1 && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={currentFrameIndex === analysis.poseTimeline.length - 1}
        >
          <Text style={styles.navButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 16,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  frameContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseIndicator: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  phaseLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  frameInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  frameNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    color: '#666',
  },
  explanationBox: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    color: '#34495e',
    lineHeight: 20,
  },
  jointAnglesBox: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  angleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  angleItem: {
    width: '48%',
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  angleLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  angleValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logsBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  logText: {
    fontSize: 11,
    color: '#495057',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#bdc3c7',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  frameCounter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
  },
  frameCounterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
});
