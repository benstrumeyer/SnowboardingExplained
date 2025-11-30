/**
 * Chat Screen
 * True conversational AI coach interface with animated message bubbles
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
  Animated,
} from 'react-native';
// @ts-ignore - Expo vector icons bundled with Expo
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { sendMessage, type VideoReference, type ChatHistoryItem } from '../services/api';

const GREETING = "Hey! I'm Taevis, your snowboarding coach. What trick or technique can I help you with today?";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  videos?: VideoReference[];
}

// Animated message bubble component
function AnimatedBubble({ 
  children, 
  sender 
}: { 
  children: React.ReactNode; 
  sender: 'user' | 'coach';
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const isUser = sender === 'user';

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scaleAnim },
        ],
        transformOrigin: isUser ? 'bottom right' : 'bottom left',
      }}
    >
      {children}
    </Animated.View>
  );
}

// Animated send button
function SendButton({ 
  onPress, 
  disabled 
}: { 
  onPress: () => void; 
  disabled: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          tw`${disabled ? 'bg-[#333333]' : 'bg-[#0066CC]'} rounded-full justify-center items-center`,
          { width: 42, height: 42 },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: GREETING, sender: 'coach' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [shownVideoIds, setShownVideoIds] = useState<string[]>([]);
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
    
    // Add user message to UI
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId,
      text: userMessage,
      sender: 'user',
    }]);
    
    // Add to history for context
    const newHistory: ChatHistoryItem[] = [...chatHistory, { role: 'user', content: userMessage }];
    
    setLoading(true);
    
    try {
      const response = await sendMessage(userMessage, sessionId, chatHistory, shownVideoIds);
      
      // Update history with coach response
      setChatHistory([...newHistory, { role: 'coach', content: response.response }]);
      
      // Track shown videos to avoid repeats
      const newVideoIds = response.videos.map(v => v.videoId);
      setShownVideoIds(prev => [...prev, ...newVideoIds]);
      
      // Add coach response to UI
      setMessages(prev => [...prev, {
        id: `coach-${Date.now()}`,
        text: response.response,
        sender: 'coach',
        videos: response.videos,
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
      style={tw`flex-1 bg-[#0D0D0D]`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={tw`bg-[#141414] pt-12 pb-4 px-4 flex-row items-center`}>
        <View style={tw`w-12`} />
        <Text style={tw`text-white text-xl font-bold`}>Taevis</Text>
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
            <View style={tw`${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <AnimatedBubble sender={msg.sender}>
                <View
                  style={tw`max-w-[85%] p-3 rounded-2xl ${
                    msg.sender === 'user' 
                      ? 'bg-[#0066CC]'  // Cool blue
                      : 'bg-[#2D2D2D]'  // Soft dark gray
                  }`}
                >
                  <Text style={tw`text-white text-base`}>
                    {msg.text}
                  </Text>
                </View>
              </AnimatedBubble>
            </View>
            
            {/* Video references (small, after message) */}
            {msg.videos && msg.videos.length > 0 && (
              <View style={tw`mt-3`}>
                <Text style={tw`text-[#A0A0A0] text-xs mb-2`}>📹 Related videos:</Text>
                {msg.videos.map((video, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={tw`flex-row bg-[#1A1A1A] rounded-lg overflow-hidden border border-[#333333] mb-2`}
                    onPress={() => openVideo(video.url)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: video.thumbnail }}
                      style={tw`w-20 h-12`}
                      resizeMode="cover"
                    />
                    <View style={tw`flex-1 p-2 justify-center`}>
                      <Text style={tw`text-white text-xs`} numberOfLines={1}>
                        {video.videoTitle}
                      </Text>
                      <Text style={tw`text-[#4DA6FF] text-xs`}>
                        ▶ {formatTimestamp(video.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View style={tw`items-start mb-4`}>
            <AnimatedBubble sender="coach">
              <View style={tw`bg-[#2D2D2D] p-4 rounded-2xl flex-row items-center`}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={tw`text-white ml-3`}>Thinking...</Text>
              </View>
            </AnimatedBubble>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={tw`flex-row items-center p-4 bg-[#141414] border-t border-[#333333]`}>
        <TextInput
          style={tw`flex-1 bg-[#262626] text-white px-4 py-3 rounded-full mr-3`}
          placeholder="Ask me anything..."
          placeholderTextColor="#A0A0A0"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!loading}
          multiline={false}
        />
        <SendButton onPress={handleSend} disabled={loading || !input.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}
