import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

interface FrameNavigationControlsProps {
  currentFrame: number;
  totalFrames: number;
  onBack: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

export const FrameNavigationControls: React.FC<
  FrameNavigationControlsProps
> = ({
  currentFrame,
  totalFrames,
  onBack,
  onNext,
  isLoading = false,
}) => {
  const isAtStart = currentFrame === 0;
  const isAtEnd = currentFrame >= totalFrames - 1;
  const progress = totalFrames > 0 ? (currentFrame / (totalFrames - 1)) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.frameInfo}>
        <Text style={styles.frameLabel}>Frame</Text>
        <Text style={styles.frameNumber}>
          {currentFrame + 1} / {totalFrames}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.backButton,
            isAtStart && styles.buttonDisabled,
          ]}
          onPress={onBack}
          disabled={isAtStart || isLoading}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.nextButton,
            isAtEnd && styles.buttonDisabled,
          ]}
          onPress={onNext}
          disabled={isAtEnd || isLoading}
        >
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  frameInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  frameLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  frameNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
