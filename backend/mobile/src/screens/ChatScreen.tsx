/**
 * Chat Screen
 * Simplified coaching flow with Taevis personality
 * Requirements: 4.1, 4.4, 5.1
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
  tips?: TipWithVideo[];
  interpretation?: {
    original: string;
    understood: string;
    concepts: string[];
  };
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: GREETING, sender: 'coach' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [lastContext, setLastContext] = useState<{ interpretedMeaning: string; concepts: string[] } | null>(null);
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
    
    // Add user message
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId,
      text: userMessage,
      sender: 'user',
    }]);
    
    setLoading(true);
    
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
      
      // Add coach response
      const coachMsgId = `coach-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: coachMsgId,
        text: response.coachMessage,
        sender: 'coach',
        tips: response.tips,
        interpretation: response.interpretation,
      }]);
      
    } catch (error: any) {
      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        text: `Sorry, I'm having trouble right now. ${error.message || 'Please try again.'}`,
        sender: 'coach',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (tip: TipWithVideo) => {
    Linking.openURL(tip.url);
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
            <View
              style={tw`${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <View
                style={tw`max-w-[85%] p-3 rounded-2xl ${
                  msg.sender === 'user' ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                <Text style={tw`text-white text-base`}>{msg.text}</Text>
              </View>
              
              {/* Show interpretation if different from input */}
              {msg.interpretation && msg.interpretation.original !== msg.interpretation.understood && (
                <Text style={tw`text-gray-500 text-xs mt-1 ml-2`}>
                  Understood: {msg.interpretation.understood}
                </Text>
              )}
            </View>
            
            {/* Tips with videos */}
            {msg.tips && msg.tips.length > 0 && (
              <View style={tw`mt-3`}>
                {msg.tips.map((tip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={tw`bg-gray-800 rounded-xl mb-3 overflow-hidden border border-gray-700`}
                    onPress={() => openVideo(tip)}
                    activeOpacity={0.8}
                  >
                    {/* Thumbnail */}
                    <Image
                      source={{ uri: tip.thumbnail }}
                      style={tw`w-full h-32`}
                      resizeMode="cover"
                    />
                    
                    {/* Tip content */}
                    <View style={tw`p-3`}>
                      <Text style={tw`text-white text-base mb-2`}>
                        {idx + 1}. {tip.tip}
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        <Text style={tw`text-blue-400 text-sm flex-1`} numberOfLines={1}>
                          📹 {tip.videoTitle}
                        </Text>
                        <Text style={tw`text-gray-400 text-sm ml-2`}>
                          ▶ {formatTimestamp(tip.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
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
