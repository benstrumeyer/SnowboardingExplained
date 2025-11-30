/**
 * Chat Screen
 * Simplified coaching flow with Taevis personality
 * - 5 tips as text
 * - 1 video thumbnail (smaller)
 * - Ask if user wants more videos
 */

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
  Image,
} from 'react-native';
import tw from 'twrnc';
import { sendMessage, type TipWithVideo, type ChatResponse } from '../services/api';

const GREETING = "Hey! I'm Taevis, your snowboarding coach. How can I help you today?";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  tips?: string[];
  video?: {
    videoId: string;
    videoTitle: string;
    timestamp: number;
    url: string;
    thumbnail: string;
  };
  askForMoreVideos?: boolean;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: GREETING, sender: 'coach' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [lastContext, setLastContext] = useState<{ interpretedMeaning: string; concepts: string[] } | null>(null);
  const [pendingVideos, setPendingVideos] = useState<TipWithVideo[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Check if user is responding to "want more videos?"
    const lowerMsg = userMessage.toLowerCase();
    if (pendingVideos.length > 0 && (lowerMsg === 'yes' || lowerMsg === 'yeah' || lowerMsg === 'sure' || lowerMsg === 'y')) {
      showMoreVideos();
      return;
    }
    
    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      text: userMessage,
      sender: 'user',
    }]);
    
    setLoading(true);
    setPendingVideos([]);
    
    try {
      const isFollowUp = lastContext !== null;
      const response = await sendMessage(
        userMessage,
        sessionId,
        isFollowUp,
        lastContext || undefined
      );
      
      // Save context for follow-ups
      if (response.interpretation) {
        setLastContext({
          interpretedMeaning: response.interpretation.understood,
          concepts: response.interpretation.concepts,
        });
      }
      
      // Extract tips as text and get first video
      const tips = response.tips.map(t => t.tip);
      const firstVideo = response.tips[0];
      const remainingVideos = response.tips.slice(1);
      
      // Store remaining videos for "want more?" flow
      setPendingVideos(remainingVideos);
      
      // Add coach response with tips and 1 video
      setMessages(prev => [...prev, {
        id: `coach-${Date.now()}`,
        text: response.coachMessage,
        sender: 'coach',
        tips: tips,
        video: firstVideo ? {
          videoId: firstVideo.videoId,
          videoTitle: firstVideo.videoTitle,
          timestamp: firstVideo.timestamp,
          url: firstVideo.url,
          thumbnail: firstVideo.thumbnail,
        } : undefined,
        askForMoreVideos: remainingVideos.length > 0,
      }]);
      
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        text: `Sorry, I'm having trouble right now. ${error.message || 'Please try again.'}`,
        sender: 'coach',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const showMoreVideos = () => {
    // Add user's "yes" message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      text: 'Yes',
      sender: 'user',
    }]);
    
    // Show remaining videos
    const videosToShow = pendingVideos.slice(0, 4); // Show up to 4 more
    
    setMessages(prev => [...prev, {
      id: `coach-${Date.now()}`,
      text: `Here are ${videosToShow.length} more videos that might help:`,
      sender: 'coach',
      tips: videosToShow.map((v, i) => `${i + 1}. ${v.videoTitle}`),
    }]);
    
    // Add each video as a small card
    videosToShow.forEach((video, index) => {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `video-${Date.now()}-${index}`,
          text: '',
          sender: 'coach',
          video: {
            videoId: video.videoId,
            videoTitle: video.videoTitle,
            timestamp: video.timestamp,
            url: video.url,
            thumbnail: video.thumbnail,
          },
        }]);
      }, index * 300);
    });
    
    setPendingVideos([]);
  };

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-900`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={tw`bg-gray-800 pt-12 pb-4 px-4`}>
        <Text style={tw`text-white text-xl font-bold text-center`}>
          🏂 Snowboarding Coach
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1 px-4`}
        contentContainerStyle={tw`py-4`}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={tw`mb-4`}>
            {/* Message bubble */}
            {msg.text ? (
              <View style={tw`${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <View
                  style={tw`max-w-[85%] p-3 rounded-2xl ${
                    msg.sender === 'user' ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                >
                  <Text style={tw`text-white text-base`}>{msg.text}</Text>
                </View>
              </View>
            ) : null}
            
            {/* Tips as numbered text list */}
            {msg.tips && msg.tips.length > 0 && (
              <View style={tw`mt-3 bg-gray-800 rounded-xl p-4`}>
                {msg.tips.map((tip, idx) => (
                  <View key={idx} style={tw`flex-row mb-2`}>
                    <Text style={tw`text-blue-400 font-bold mr-2`}>{idx + 1}.</Text>
                    <Text style={tw`text-white flex-1 text-base`}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Single video thumbnail (smaller) */}
            {msg.video && (
              <TouchableOpacity
                style={tw`mt-3 flex-row bg-gray-800 rounded-lg overflow-hidden border border-gray-700`}
                onPress={() => openVideo(msg.video!.url)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: msg.video.thumbnail }}
                  style={tw`w-24 h-16`}
                  resizeMode="cover"
                />
                <View style={tw`flex-1 p-2 justify-center`}>
                  <Text style={tw`text-white text-sm`} numberOfLines={2}>
                    {msg.video.videoTitle}
                  </Text>
                  <Text style={tw`text-blue-400 text-xs mt-1`}>
                    ▶ {formatTimestamp(msg.video.timestamp)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Ask for more videos */}
            {msg.askForMoreVideos && (
              <View style={tw`mt-3`}>
                <Text style={tw`text-gray-400 text-sm mb-2`}>
                  Want to see more videos on this topic?
                </Text>
                <View style={tw`flex-row`}>
                  <TouchableOpacity
                    style={tw`bg-blue-500 px-4 py-2 rounded-full mr-2`}
                    onPress={showMoreVideos}
                  >
                    <Text style={tw`text-white font-bold`}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`bg-gray-700 px-4 py-2 rounded-full`}
                    onPress={() => setPendingVideos([])}
                  >
                    <Text style={tw`text-white`}>No thanks</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View style={tw`items-start mb-4`}>
            <View style={tw`bg-gray-700 p-4 rounded-2xl flex-row items-center`}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={tw`text-white ml-3`}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={tw`flex-row p-4 bg-gray-800 border-t border-gray-700`}>
        <TextInput
          style={tw`flex-1 bg-gray-700 text-white px-4 py-3 rounded-full mr-2`}
          placeholder="Ask me anything about snowboarding..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!loading}
        />
        <TouchableOpacity
          style={tw`${
            loading || !input.trim() ? 'bg-gray-600' : 'bg-blue-500'
          } px-6 py-3 rounded-full justify-center`}
          onPress={handleSend}
          disabled={loading || !input.trim()}
        >
          <Text style={tw`text-white font-bold`}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
