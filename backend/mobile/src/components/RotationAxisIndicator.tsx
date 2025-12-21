import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { PoseData } from '../services/poseAnalysisService';

interface RotationAxisIndicatorProps {
  poseData: PoseData;
  isVisible?: boolean;
  width?: number;
  height?: number;
}

export const RotationAxisIndicator: React.FC<RotationAxisIndicatorProps> = ({
  poseData,
  isVisible = true,
  width = Dimensions.get('window').width,
  height = (Dimensions.get('window').width * 9) / 16,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !isVisible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Find waist position (average of hip positions)
    const leftHip = poseData.joints.find((j) => j.name === 'left_hip');
    const rightHip = poseData.joints.find((j) => j.name === 'right_hip');

    if (!leftHip || !rightHip) return;

    const waistX = (leftHip.x + rightHip.x) / 2;
    const waistY = (leftHip.y + rightHip.y) / 2;

    // Calculate rotation axis from momentum vector
    const momentumSignal = poseData.detectionSignals.find(
      (s) => s.name === 'momentum_vector'
    );

    if (!momentumSignal) return;

    // Extract momentum vector (assuming it's stored in value as JSON or similar)
    let momentumX = 1;
    let momentumY = 0;
    let momentumZ = 0;

    // Try to parse momentum from signal value
    if (typeof momentumSignal.value === 'object') {
      momentumX = (momentumSignal.value as any).x || 1;
      momentumY = (momentumSignal.value as any).y || 0;
      momentumZ = (momentumSignal.value as any).z || 0;
    }

    // Normalize momentum vector
    const momentumMagnitude = Math.sqrt(
      momentumX ** 2 + momentumY ** 2 + momentumZ ** 2
    );
    momentumX /= momentumMagnitude;
    momentumY /= momentumMagnitude;
    momentumZ /= momentumMagnitude;

    // Calculate 3D oval dimensions based on z-index
    const baseRadiusX = 50;
    const baseRadiusY = 30;

    // Z-index affects the oval shape (perspective)
    const zIndex = leftHip.z || 0;
    const perspectiveScale = 1 + zIndex * 0.1; // Adjust based on z-depth

    const radiusX = baseRadiusX * perspectiveScale;
    const radiusY = baseRadiusY * perspectiveScale;

    // Draw 3D oval (slightly oval for 3D appearance)
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();

    // Draw ellipse
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const x = waistX + radiusX * Math.cos(angle);
      const y = waistY + radiusY * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw rotation direction arrow
    const arrowAngle = Math.atan2(momentumY, momentumX);
    const arrowLength = 40;
    const arrowX = waistX + Math.cos(arrowAngle) * arrowLength;
    const arrowY = waistY + Math.sin(arrowAngle) * arrowLength;

    // Arrow shaft
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(waistX, waistY);
    ctx.lineTo(arrowX, arrowY);
    ctx.stroke();

    // Arrow head
    const arrowHeadSize = 8;
    ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowHeadSize * Math.cos(arrowAngle - Math.PI / 6),
      arrowY - arrowHeadSize * Math.sin(arrowAngle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowX - arrowHeadSize * Math.cos(arrowAngle + Math.PI / 6),
      arrowY - arrowHeadSize * Math.sin(arrowAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Draw center point
    ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(waistX, waistY, 4, 0, 2 * Math.PI);
    ctx.fill();
  }, [poseData, isVisible, width, height]);

  if (!isVisible) {
    return null;
  }

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
