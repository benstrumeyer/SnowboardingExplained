import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface YoutubeCardPlayerProps {
  thumbnail: string;
  videoUrl: string;
  isLoading?: boolean;
}

export default function YoutubeCardPlayer({
  thumbnail,
  videoUrl,
  isLoading = false,
}: YoutubeCardPlayerProps) {
  const handlePress = () => {
    Linking.openURL(videoUrl);
  };

  return (
    <View style={tw`overflow-hidden`}>
      <TouchableOpacity
        onPress={handlePress}
        style={tw`rounded-t-2xl overflow-hidden -mt-12 -mb-16`}
        activeOpacity={0.8}
      >
        <View style={tw`relative w-full h-72`}>
          {isLoading ? (
            <View style={tw`w-full h-full bg-gray-700`} />
          ) : (
            <Image
              source={{ uri: thumbnail }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
          )}

          {/* YouTube Play Button Overlay */}
          <View style={tw`absolute inset-0 items-center justify-center bg-black/20`}>
            <View style={tw`bg-gray-500 rounded-full p-4`}>
              <MaterialCommunityIcons name="play" size={40} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Spacer to hide black bars */}
      <View style={tw`w-full h-16 bg-[#141414] -mb-8`} />
    </View>
  );
}
