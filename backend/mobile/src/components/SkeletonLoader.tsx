import React, { useEffect } from 'react';
import { View, Animated } from 'react-native';
import tw from 'twrnc';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: any;
}

export default function SkeletonLoader({
  width = '100%',
  height = 'h-4',
  borderRadius = 'rounded',
  style,
}: SkeletonLoaderProps) {
  const waveAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [waveAnim]);

  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 400],
  });

  return (
    <View
      style={[
        tw`${height} bg-gray-800 ${borderRadius} overflow-hidden`,
        { width },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '15%',
            transform: [{ translateX }, { skewX: '-20deg' }],
            backgroundColor: 'rgba(107, 114, 128, 0.8)',
          },
        ]}
      />
    </View>
  );
}
