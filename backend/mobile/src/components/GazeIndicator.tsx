import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PoseData } from '../services/poseAnalysisService';

interface GazeIndicatorProps {
  poseData: PoseData;
  width?: number;
  height?: number;
}

export const GazeIndicator: React.FC<GazeIndicatorProps> = ({
  poseData,
  width = Dimensions.get('window').width,
  height = (Dimensions.get('window').width * 9) / 16,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Find head position (nose or average of eye positions)
    const noseJoint = poseData.joints.find((j) => j.name === 'nose');
    const leftEye = poseData.joints.find((j) => j.name === 'left_eye');
    const rightEye = poseData.joints.find((j) => j.name === 'right_eye');

    if (!noseJoint || !leftEye || !rightEye) return;

    // Calculate head center
    const headX = (leftEye.x + rightEye.x) / 2;
    const headY = (leftEye.y + rightEye.y) / 2;

    // Get gaze direction from pose data
    const gazeDir = poseData.joints.find((j) => j.name === 'gaze_direction');
    if (!gazeDir) return;

    // Normalize gaze direction
    const gazeMagnitude = Math.sqrt(
      gazeDir.x ** 2 + gazeDir.y ** 2 + gazeDir.z ** 2
    );
    const normalizedGazeX = gazeDir.x / gazeMagnitude;
    const normalizedGazeY = gazeDir.y / gazeMagnitude;

    // Arrow parameters
    const arrowLength = 40;
    const arrowWidth = 3;
    const arrowHeadSize = 8;

    // Calculate arrow end point
    const endX = headX + normalizedGazeX * arrowLength;
    const endY = headY + normalizedGazeY * arrowLength;

    // Draw arrow shaft
    ctx.strokeStyle = `rgba(255, 200, 100, ${gazeDir.confidence})`;
    ctx.lineWidth = arrowWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrow head
    const angle = Math.atan2(normalizedGazeY, normalizedGazeX);
    ctx.fillStyle = `rgba(255, 200, 100, ${gazeDir.confidence})`;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
      endY - arrowHeadSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
      endY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Draw confidence indicator
    const confidenceRadius = 6;
    ctx.fillStyle = `rgba(255, 200, 100, ${gazeDir.confidence * 0.5})`;
    ctx.beginPath();
    ctx.arc(headX, headY, confidenceRadius, 0, 2 * Math.PI);
    ctx.fill();
  }, [poseData, width, height]);

  return (
    <View style={[styles.container, { width, height }]}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={styles.canvas}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});
