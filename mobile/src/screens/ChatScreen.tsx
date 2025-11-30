/**
 * Chat Screen
 * Main chat interface with sidebar integration
 * Requirements: 10.1, 13.1, 13.2
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
} from 'react-native';
import tw from 'twrnc';
import { useContextCollection } from '../hooks/useContextCollection';
import { sendChatMessage } from '../services/api';
import { Sidebar, InputMode, ChatHistoryItem } from '../components/Sidebar';
import { VoiceInput } from '../components/VoiceInput';
import { getChatHistoryItems, createChat, getChatById, addMessageToChat, StoredChat } from '../services/chatStorage';
import type { VideoReference, UserContext, ChatMessage } from '../types';

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
  const [hasCalledAPI, setHasCalledAPI] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    const history = await getChatHistoryItems();
    setChatHistory(history);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

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
        currentChatId || 'session-' + Date.now()
      );

      // Add coach's response
      addCoachResponse(response.response);
      setVideos(response.videos);
      
      // Save to chat history
      if (context.trick) {
        const chat = await createChat(context as UserContext);
        setCurrentChatId(chat.id);
        await loadChatHistory();
      }
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

  const handleVoiceTranscript = (text: string) => {
    if (text.trim()) {
      handleUserMessage(text.trim());
    }
  };

  const handleReset = () => {
    reset();
    setVideos([]);
    setHasCalledAPI(false);
    setCurrentChatId(null);
  };

  const handleSelectChat = async (chatId: string) => {
    const chat = await getChatById(chatId);
    if (chat) {
      // TODO: Restore chat state
      setCurrentChatId(chatId);
    }
  };

  const openVideo = (video: VideoReference) => {
    Linking.openURL(video.url);
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-900`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMode={inputMode}
        onModeChange={setInputMode}
        chatHistory={chatHistory}
        onSelectChat={handleSelectChat}
        onNewChat={handleReset}
      />

      {/* Menu Button - No header, just floating menu icon */}
      <TouchableOpacity
        style={tw`absolute top-12 left-4 z-10 bg-gray-800 p-3 rounded-full`}
        onPress={() => setSidebarOpen(true)}
      >
        <Text style={tw`text-white text-lg`}>☰</Text>
      </TouchableOpacity>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1 pt-20 px-4`}
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

        {/* Video References */}
        {videos.length > 0 && (
          <View style={tw`mt-4`}>
            <Text style={tw`text-gray-400 mb-3 font-bold`}>📹 Related Videos:</Text>
            {videos.map((video, idx) => (
              <TouchableOpacity
                key={idx}
                style={tw`bg-gray-800 p-4 rounded-lg mb-3 border border-gray-700`}
                onPress={() => openVideo(video)}
              >
                <Text style={tw`text-white font-bold text-base mb-1`}>
                  {video.title}
                </Text>
                <Text style={tw`text-gray-400 text-sm mb-2`}>
                  "{video.quote}..."
                </Text>
                <Text style={tw`text-blue-400 text-sm`}>
                  ▶ Watch at {Math.floor(video.timestamp / 60)}:{String(Math.floor(video.timestamp % 60)).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      {inputMode === 'text' ? (
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
      ) : (
        <View style={tw`p-4 bg-gray-800 border-t border-gray-700`}>
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            disabled={loading || isComplete}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
