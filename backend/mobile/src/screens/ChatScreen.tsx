import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import tw from 'twrnc';
import { useContextCollection } from '../hooks/useContextCollection';
import { sendChatMessage } from '../services/api';
import type { VideoReference } from '../types';

export default function ChatScreen() {
  const {
    messages,
    isComplete,
    handleUserMessage,
    addCoachResponse,
    reset,
    getUserContext,
  } = useContextCollection();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoReference[]>([]);
  const [visibleVideos, setVisibleVideos] = useState<VideoReference[]>([]);
  const [hasCalledAPI, setHasCalledAPI] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when messages or videos change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading, visibleVideos]);

  // Call API when context is complete
  useEffect(() => {
    if (isComplete && !hasCalledAPI) {
      setHasCalledAPI(true);
      callAPI();
    }
  }, [isComplete, hasCalledAPI]);

  const callAPI = async () => {
    setLoading(true);

    try {
      const context = getUserContext();
      const response = await sendChatMessage(
        context,
        undefined,
        'session-' + Date.now()
      );

      // Add coach's response (shortened)
      const shortResponse = response.response.split('\n\n')[0]; // First paragraph only
      addCoachResponse(shortResponse);
      
      // Stagger video display
      setVideos(response.videos);
      setVisibleVideos([]);
      
      // Show videos one by one with delay
      response.videos.forEach((video, index) => {
        setTimeout(() => {
          setVisibleVideos(prev => [...prev, video]);
        }, 1000 + (index * 800)); // 1s delay, then 800ms between each
      });
    } catch (error: any) {
      addCoachResponse(
        `Sorry, I'm having trouble right now. ${error.message || 'Please try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    handleUserMessage(userMessage);
  };

  const handleReset = () => {
    reset();
    setVideos([]);
    setVisibleVideos([]);
    setHasCalledAPI(false);
  };

  const openVideo = (video: VideoReference) => {
    Linking.openURL(video.url);
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-900`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={tw`bg-gray-800 pt-12 pb-4 px-4 border-b border-gray-700`}>
        <Text style={tw`text-white text-xl font-bold`}>Snowboarding Explained</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1 p-4`}
        contentContainerStyle={tw`pb-4`}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={tw`mb-3 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <View
              style={tw`max-w-[80%] p-3 rounded-2xl ${
                msg.sender === 'user' ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <Text style={tw`text-white text-base`}>{msg.text}</Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={tw`items-start mb-3`}>
            <View style={tw`bg-gray-700 p-4 rounded-2xl flex-row items-center`}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={tw`text-white ml-3`}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Video References - Staggered */}
        {visibleVideos.length > 0 && (
          <View style={tw`mt-4`}>
            {visibleVideos.map((video, idx) => (
              <TouchableOpacity
                key={idx}
                style={tw`bg-gray-800 p-3 rounded-lg mb-2 border border-gray-700 flex-row items-center`}
                onPress={() => openVideo(video)}
              >
                <View style={tw`bg-gray-700 w-16 h-16 rounded mr-3 items-center justify-center`}>
                  <Text style={tw`text-3xl`}>📹</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white font-bold text-sm mb-1`} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={tw`text-blue-400 text-xs`}>
                    ▶ {Math.floor(video.timestamp / 60)}:{String(Math.floor(video.timestamp % 60)).padStart(2, '0')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={tw`flex-row p-4 bg-gray-800 border-t border-gray-700`}>
        <TextInput
          style={tw`flex-1 bg-gray-700 text-white px-4 py-3 rounded-full mr-2`}
          placeholder={isComplete ? "Waiting for coach..." : "Type your answer..."}
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!loading && !isComplete}
        />
        <TouchableOpacity
          style={tw`${
            loading || !input.trim() || isComplete ? 'bg-gray-600' : 'bg-blue-500'
          } px-6 py-3 rounded-full justify-center`}
          onPress={handleSend}
          disabled={loading || !input.trim() || isComplete}
        >
          <Text style={tw`text-white font-bold`}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
