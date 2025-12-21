import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PhaseIndicatorOverlayProps {
  phaseName: string;
  phaseColor: string;
  framePosition: string;
  isVisible: boolean;
}

const PHASE_COLORS: { [key: string]: string } = {
  'Setup Carve': '#FF6B6B',
  'Wind Up': '#4ECDC4',
  'Snap': '#45B7D1',
  'Takeoff': '#FFA07A',
  'Air': '#98D8C8',
  'Landing': '#F7DC6F',
};

export const PhaseIndicatorOverlay: React.FC<PhaseIndicatorOverlayProps> = ({
  phaseName,
  phaseColor,
  framePosition,
  isVisible,
}) => {
  if (!isVisible) {
    return null;
  }

  const displayColor = PHASE_COLORS[phaseName] || phaseColor;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: displayColor,
          },
        ]}
      >
        <Text style={styles.phaseName}>{phaseName}</Text>
        <Text style={styles.framePosition}>{framePosition}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
  },
  indicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  phaseName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  framePosition: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
