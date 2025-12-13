import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Rect, Polyline, Text as SvgText, G } from 'react-native-svg';

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name?: string;
}

interface DetectionMetrics {
  headGaze: string;
  bodyStack: string;
  legBend: number;
  upperBodyRotation: number;
  edgeType: string;
  snapIntensity: number;
  phase: string;
}

interface VideoAnalysisOverlayProps {
  frameWidth: number;
  frameHeight: number;
  keypoints: Keypoint[];
  metrics: DetectionMetrics;
  phase: 'setupCarve' | 'windupSnap' | 'grab' | 'landing';
  pathTrail: Array<{ x: number; y: number; frameNumber: number }>;
}

const PHASE_COLORS = {
  setupCarve: '#FF0000',    // Red
  windupSnap: '#FFA500',    // Orange
  grab: '#FFFF00',          // Yellow
  landing: '#00FFFF'        // Cyan
};

const KEYPOINT_CONNECTIONS = [
  // Head
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  // Arms
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  // Torso
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  // Legs
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle']
];

export const VideoAnalysisOverlay: React.FC<VideoAnalysisOverlayProps> = ({
  frameWidth,
  frameHeight,
  keypoints,
  metrics,
  phase,
  pathTrail
}) => {
  const phaseColor = PHASE_COLORS[phase];

  const getKeypointByName = (name: string): Keypoint | undefined => {
    return keypoints.find(kp => kp.name === name);
  };

  const renderPoseSkeleton = () => {
    const lines = KEYPOINT_CONNECTIONS.map((connection, idx) => {
      const [name1, name2] = connection;
      const kp1 = getKeypointByName(name1);
      const kp2 = getKeypointByName(name2);

      if (!kp1 || !kp2 || kp1.confidence < 0.5 || kp2.confidence < 0.5) {
        return null;
      }

      return (
        <Line
          key={`line-${idx}`}
          x1={kp1.x}
          y1={kp1.y}
          x2={kp2.x}
          y2={kp2.y}
          stroke={phaseColor}
          strokeWidth="2"
          opacity="0.8"
        />
      );
    });

    const circles = keypoints
      .filter(kp => kp.confidence > 0.5)
      .map((kp, idx) => (
        <Circle
          key={`circle-${idx}`}
          cx={kp.x}
          cy={kp.y}
          r="4"
          fill={phaseColor}
          opacity="0.9"
        />
      ));

    return [...lines, ...circles];
  };

  const renderPathTrail = () => {
    if (pathTrail.length < 2) return null;

    const points = pathTrail.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <Polyline
        points={points}
        fill="none"
        stroke={phaseColor}
        strokeWidth="2"
        opacity="0.6"
        strokeDasharray="5,5"
      />
    );
  };

  const renderSnowboardOutline = () => {
    // Estimate snowboard position from hip keypoints
    const leftHip = getKeypointByName('left_hip');
    const rightHip = getKeypointByName('right_hip');

    if (!leftHip || !rightHip) return null;

    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const boardWidth = Math.abs(rightHip.x - leftHip.x) * 1.5;
    const boardHeight = boardWidth * 0.3;

    return (
      <Rect
        x={hipMidX - boardWidth / 2}
        y={hipMidY - boardHeight / 2}
        width={boardWidth}
        height={boardHeight}
        fill="none"
        stroke={phaseColor}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.7"
      />
    );
  };

  const renderHeadGazeArrow = () => {
    const nose = getKeypointByName('nose');
    if (!nose) return null;

    const arrowLength = 40;
    let endX = nose.x;
    let endY = nose.y;

    switch (metrics.headGaze) {
      case 'forward':
        endY -= arrowLength;
        break;
      case 'down':
        endY += arrowLength;
        break;
      case 'up':
        endY -= arrowLength;
        break;
      case 'left':
        endX -= arrowLength;
        break;
      case 'right':
        endX += arrowLength;
        break;
    }

    return (
      <Line
        x1={nose.x}
        y1={nose.y}
        x2={endX}
        y2={endY}
        stroke="#00FF00"
        strokeWidth="3"
        opacity="0.9"
      />
    );
  };

  return (
    <View style={styles.container}>
      <Svg width={frameWidth} height={frameHeight} style={styles.svg}>
        {/* Path trail */}
        {renderPathTrail()}

        {/* Snowboard outline */}
        {renderSnowboardOutline()}

        {/* Pose skeleton */}
        {renderPoseSkeleton()}

        {/* Head gaze arrow */}
        {renderHeadGazeArrow()}

        {/* Phase label */}
        <Rect
          x="10"
          y="10"
          width="120"
          height="30"
          fill={phaseColor}
          opacity="0.8"
          rx="5"
        />
        <SvgText
          x="70"
          y="32"
          fontSize="14"
          fill="white"
          fontWeight="bold"
          textAnchor="middle"
        >
          {phase}
        </SvgText>
      </Svg>

      {/* Detection metrics panel */}
      <View style={[styles.metricsPanel, { borderColor: phaseColor }]}>
        <Text style={styles.metricLabel}>Head Gaze: {metrics.headGaze}</Text>
        <Text style={styles.metricLabel}>Body Stack: {metrics.bodyStack}</Text>
        <Text style={styles.metricLabel}>Leg Bend: {metrics.legBend.toFixed(1)}°</Text>
        <Text style={styles.metricLabel}>Upper Body Rotation: {metrics.upperBodyRotation.toFixed(1)}°</Text>
        <Text style={styles.metricLabel}>Edge: {metrics.edgeType}</Text>
        <Text style={styles.metricLabel}>Snap Intensity: {metrics.snapIntensity.toFixed(0)}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent'
  },
  svg: {
    flex: 1
  },
  metricsPanel: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    maxWidth: 200
  },
  metricLabel: {
    color: 'white',
    fontSize: 12,
    marginVertical: 2,
    fontFamily: 'monospace'
  }
});
