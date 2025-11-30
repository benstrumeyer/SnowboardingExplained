import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import VideoCardSkeleton from './VideoCardSkeleton';

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: number;
  tips: string[];
  onOpenVideo: () => void;
  formatDuration: (seconds: number) => string;
  isLoading?: boolean;
}

export default function VideoCard({
  title,
  thumbnail,
  duration,
  tips,
  onOpenVideo,
  formatDuration,
  isLoading = false,
}: VideoCardProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Video Thumbnail */}
      {isLoading && !thumbnail ? (
        <View style={tw`w-full h-48 bg-gray-700 mt-0`} />
      ) : (
        <TouchableOpacity
          onPress={onOpenVideo}
          style={tw`mt-0`}
        >
          <View style={tw`relative`}>
            <Image
              source={{ uri: thumbnail }}
              style={tw`w-full h-48 bg-gray-800`}
              resizeMode="cover"
            />
            {/* Play Button Overlay */}
            <View style={tw`absolute inset-0 items-center justify-center`}>
              <View style={tw`bg-black/60 rounded-full p-3`}>
                <MaterialCommunityIcons name="play" size={32} color="#fff" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Duration and View Button */}
      {!duration || duration === 0 ? (
        <View style={tw`px-4 mt-4 flex-row items-center justify-between gap-2`}>
          <View style={tw`h-4 bg-gray-700 rounded w-20`} />
          <View style={tw`h-10 bg-gray-700 rounded-lg flex-1`} />
        </View>
      ) : (
        <View style={tw`px-4 mt-4 flex-row items-center justify-between`}>
          <Text style={tw`text-gray-400 text-sm`}>
            {formatDuration(duration)}
          </Text>
          <TouchableOpacity
            onPress={onOpenVideo}
            style={tw`flex-row items-center justify-center bg-[#16A34A] px-4 py-3 rounded-lg flex-1 ml-4`}
          >
            <Text style={tw`text-white font-semibold`}>View on YouTube</Text>
            <Text style={tw`text-white ml-2`}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Title */}
      {isLoading && !title ? (
        <View style={tw`h-6 bg-gray-700 rounded mb-4 w-3/4 mx-4 mt-4`} />
      ) : (
        <Text style={tw`text-white text-xl font-bold px-4 pt-4`}>
          {title}
        </Text>
      )}

      {/* Summary Section */}
      <View style={tw`px-4 mt-6 pb-6`}>
        <Text style={tw`text-white text-lg font-bold mb-3`}>Summary</Text>
        {!tips || tips.length === 0 ? (
          <>
            {[1, 2, 3].map((i) => (
              <View key={i} style={tw`bg-gray-700 rounded-lg p-3 mb-3 h-16`} />
            ))}
          </>
        ) : (
          tips.map((tip, idx) => (
            <View key={idx} style={tw`bg-[#1A1A1A] rounded-lg p-3 mb-3`}>
              <Text style={tw`text-white text-sm leading-5`}>{tip}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
