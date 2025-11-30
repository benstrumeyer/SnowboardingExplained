import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

export default function VideoCardSkeleton() {
  return (
    <View style={tw`p-4`}>
      {/* Title skeleton */}
      <View style={tw`h-6 bg-gray-700 rounded mb-4 w-3/4`} />

      {/* Thumbnail skeleton */}
      <View style={tw`w-full h-48 bg-gray-700 rounded-lg mb-4`} />

      {/* Duration and button skeleton */}
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <View style={tw`h-4 bg-gray-700 rounded w-20`} />
        <View style={tw`h-10 bg-gray-700 rounded-lg flex-1 ml-4`} />
      </View>

      {/* Summary section skeleton */}
      <View style={tw`mt-6`}>
        <View style={tw`h-6 bg-gray-700 rounded mb-3 w-24`} />
        
        {/* Skeleton tips */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={tw`bg-gray-700 rounded-lg p-3 mb-3 h-16`} />
        ))}
      </View>
    </View>
  );
}
