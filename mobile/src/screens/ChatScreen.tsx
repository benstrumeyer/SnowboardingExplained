/**
 * Chat Screen
 * Displays the coaching response and video references
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image } from 'react-native';
import tw from 'twrnc';
import type { UserContext, VideoReference } from '../types';
import { sendChatMessage } from '../services/api';

interface Props {
  context: UserContext;
  onBack: () => void;
}

export default function ChatScreen({ context, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [videos, setVideos] = useState<VideoReference[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCoaching();
  }, []);

  const fetchCoaching = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await sendChatMessage(context);
      
      setResponse(result.response);
      setVideos(result.videos);
    } catch (err: any) {
      setError(err.message || 'Failed to get coaching advice');
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (video: VideoReference) => {
    Linking.openURL(video.url);
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white items-center justify-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={tw`text-gray-600 mt-4`}>Getting coaching advice...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 bg-white p-6 justify-center`}>
        <Text style={tw`text-red-500 text-lg mb-4`}>❌ {error}</Text>
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-lg p-4 items-center`}
          onPress={fetchCoaching}
        >
          <Text style={tw`text-white font-semibold`}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`mt-4 p-4 items-center`}
          onPress={onBack}
        >
          <Text style={tw`text-gray-600`}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-white`}>
      <View style={tw`p-6`}>
        {/* Header */}
        <TouchableOpacity onPress={onBack} style={tw`mb-4`}>
          <Text style={tw`text-blue-500 text-base`}>← Back</Text>
        </TouchableOpacity>

        <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>
          🏂 Your Coach Says:
        </Text>
        <Text style={tw`text-gray-600 mb-6`}>
          About: {context.trick}
        </Text>

        {/* Coaching Response */}
        <View style={tw`bg-gray-100 rounded-lg p-4 mb-6`}>
          <Text style={tw`text-gray-900 text-base leading-6`}>
            {response}
          </Text>
        </View>

        {/* Video References */}
        {videos.length > 0 && (
          <View style={tw`mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
              📹 Watch These Videos:
            </Text>
            
            {videos.map((video, index) => (
              <TouchableOpacity
                key={video.videoId}
                style={tw`bg-white border border-gray-200 rounded-lg mb-3 overflow-hidden`}
                onPress={() => openVideo(video)}
              >
                <Image
                  source={{ uri: video.thumbnail }}
                  style={tw`w-full h-40`}
                  resizeMode="cover"
                />
                <View style={tw`p-3`}>
                  <Text style={tw`font-semibold text-gray-900 mb-1`}>
                    {video.title}
                  </Text>
                  <Text style={tw`text-sm text-gray-600 mb-2`}>
                    {Math.floor(video.timestamp / 60)}:{(video.timestamp % 60).toFixed(0).padStart(2, '0')} • Tap to watch
                  </Text>
                  <Text style={tw`text-xs text-gray-500 italic`}>
                    "{video.quote.substring(0, 100)}..."
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* New Session Button */}
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-lg p-4 items-center`}
          onPress={onBack}
        >
          <Text style={tw`text-white font-semibold`}>
            Ask About Another Trick
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
