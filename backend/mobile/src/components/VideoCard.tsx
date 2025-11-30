import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import YoutubeCardPlayer from './YoutubeCardPlayer';
import SkeletonLoader from './SkeletonLoader';

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: number;
  tips: string[];
  videoUrl: string;
  formatDuration: (seconds: number) => string;
  isLoading?: boolean;
}

export default function VideoCard({
  title,
  thumbnail,
  duration,
  tips,
  videoUrl,
  formatDuration,
  isLoading = false,
}: VideoCardProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={true} contentContainerStyle={tw`p-0`}>
        {/* YouTube Player */}
        <YoutubeCardPlayer
          thumbnail={thumbnail}
          videoUrl={videoUrl}
          isLoading={isLoading && !thumbnail}
        />

        {/* Duration and View on YouTube Button */}
        <View style={tw`px-4 -mt-2 flex-row items-center justify-between`}>
          {!duration || duration === 0 ? (
            <SkeletonLoader width={48} height="h-5" borderRadius="rounded" />
          ) : (
            <Text style={tw`text-gray-400 text-sm`}>
              {formatDuration(duration)}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => Linking.openURL(videoUrl)}
            style={tw`bg-green-600 px-4 py-2 rounded flex-row items-center gap-2`}
          >
            <Text style={tw`text-white font-bold text-sm`}>View on YouTube</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        {isLoading && !title ? (
          <View style={tw`px-4 pt-4 mb-4`}>
            <SkeletonLoader width="75%" height="h-6" borderRadius="rounded" />
          </View>
        ) : (
          <Text style={tw`text-white text-xl font-bold px-4 pt-4`}>
            {title}
          </Text>
        )}

        {/* Summary Section */}
        <View style={tw`px-4 mt-3 pb-6`}>
          {!tips || tips.length === 0 ? (
            <>
              {[1, 2, 3].map((i) => (
                <View key={i} style={tw`rounded-lg p-3 mb-3 h-16 overflow-hidden`}>
                  <SkeletonLoader width="100%" height="h-16" borderRadius="rounded-lg" />
                </View>
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
