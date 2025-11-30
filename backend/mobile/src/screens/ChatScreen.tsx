/**
 * Chat Screen
 * True conversational AI coach interface
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
import { sendMessage, type VideoReference, type ChatHistoryItem } from '../services/api';

const GREETING = "Hey! I'm Taevis, your snowboarding coach. What trick or technique can I help you with today?";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  videos?: VideoReference[];
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

  const handleNewChat = () => {
    setMessages([{ id: '1', text: GREETING, sender: 'coach' }]);
    setChatHistory([]);
    setShownVideoIds([]);  // Reset shown videos for new chat
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-900`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header - with space for hamburger menu */}
      <View style={tw`bg-gray-800 pt-12 pb-4 px-4 flex-row justify-between items-center`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-10`} />{/* Space for hamburger menu */}
          <Text style={tw`text-white text-xl font-bold`}>
            🏂 Taevis
          </Text>
        </View>
        <TouchableOpacity onPress={handleNewChat}>
          <Text style={tw`text-blue-400`}>New Chat</Text>
        </TouchableOpacity>
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
              <View
                style={tw`max-w-[85%] p-3 rounded-2xl ${
                  msg.sender === 'user' ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                <Text style={tw`text-white text-base`}>{msg.text}</Text>
              </View>
            </View>
            
            {/* Video references (small, after message) */}
            {msg.videos && msg.videos.length > 0 && (
              <View style={tw`mt-3`}>
                <Text style={tw`text-gray-400 text-xs mb-2`}>📹 Related videos:</Text>
                {msg.videos.map((video, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={tw`flex-row bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-2`}
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
                      <Text style={tw`text-blue-400 text-xs`}>
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
          placeholder="Ask me anything..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!loading}
          multiline={false}
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
