/**
 * Frame Carousel Component
 * Displays annotated frames with Previous/Next navigation
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface FrameData {
  frameNumber: number;
  timestamp: number;
  imageBase64: string; // data:image/png;base64,...
}

interface FrameCarouselProps {
  frames: FrameData[];
  onFrameChange?: (frameIndex: number) => void;
  loading?: boolean;
}

export const FrameCarousel: React.FC<FrameCarouselProps> = ({
  frames,
  onFrameChange,
  loading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onFrameChange?.(newIndex);
    }
  };

  const goToNext = () => {
    if (currentIndex < frames.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onFrameChange?.(newIndex);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={styles.loadingText}>Analyzing video...</Text>
      </View>
    );
  }

  if (frames.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No frames to display</Text>
      </View>
    );
  }

  const currentFrame = frames[currentIndex];

  return (
    <View style={styles.container}>
      {/* Frame Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: currentFrame.imageBase64 }}
          style={styles.frameImage}
          resizeMode="contain"
        />
      </View>

      {/* Frame Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.frameCounter}>
          Frame {currentIndex + 1} of {frames.length}
        </Text>
        <Text style={styles.timestamp}>
          {currentFrame.timestamp.toFixed(0)}ms
        </Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={goToPrevious}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
            ← Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.dotContainer}>
          {frames.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.navButton, currentIndex === frames.length - 1 && styles.navButtonDisabled]}
          onPress={goToNext}
          disabled={currentIndex === frames.length - 1}
        >
          <Text style={[styles.navButtonText, currentIndex === frames.length - 1 && styles.navButtonTextDisabled]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  frameCounter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    color: '#888',
    fontSize: 12,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#00BFFF',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#333',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#00BFFF',
  },
});

export default FrameCarousel;
