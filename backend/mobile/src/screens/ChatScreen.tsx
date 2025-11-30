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
  Linking,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - Expo vector icons bundled with Expo
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { sendMessage, type VideoReference, type ChatHistoryItem } from '../services/api';

const GREETING = "Hey! I'm Taevis, your snowboarding coach. What trick or technique can I help you with today?";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  videos?: VideoReference[];  // 3 videos per question
  messageType?: 'text' | 'tip' | 'follow-up';
}

// Helper to add messages with delay for human-like feel
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Typing indicator with animated dots
function TypingIndicator() {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDot(prev => (prev + 1) % 3);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const getDotColor = (index: number) => {
    return index === activeDot ? '#FFFFFF' : '#4A4A4A';
  };

  return (
    <View style={tw`flex-row gap-1.5`}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            tw`rounded-full`,
            {
              width: 8,
              height: 8,
              backgroundColor: getDotColor(index),
            },
          ]}
        />
      ))}
    </View>
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
  const [shownTipIds, setShownTipIds] = useState<string[]>([]);
  const [currentTrick, setCurrentTrick] = useState<string | undefined>();
  const scrollViewRef = useRef<ScrollView>(null);

  // Load persisted video tracking from storage on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const stored = await AsyncStorage.getItem('shownVideoIds');
        if (stored) {
          setShownVideoIds(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load persisted video IDs:', error);
      }
    };
    loadPersistedData();
  }, []);

  // Persist video IDs whenever they change
  useEffect(() => {
    const persistData = async () => {
      try {
        await AsyncStorage.setItem('shownVideoIds', JSON.stringify(shownVideoIds));
      } catch (error) {
        console.error('Failed to persist video IDs:', error);
      }
    };
    persistData();
  }, [shownVideoIds]);

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
      const response = await sendMessage(userMessage, sessionId, chatHistory, shownVideoIds, shownTipIds, currentTrick);
      
      // Update history with combined coach response for context
      const combinedResponse = response.messages.map(m => m.content).join('\n');
      setChatHistory([...newHistory, { role: 'coach', content: combinedResponse }]);
      
      // Deduplicate videos on frontend - filter out any already shown
      const newVideoIds = response.videos?.map(v => v.videoId) || [];
      const uniqueNewVideos = response.videos?.filter(v => !shownVideoIds.includes(v.videoId)) || [];
      
      // Track shown videos to never repeat them
      setShownVideoIds(prev => [...prev, ...newVideoIds]);
      
      // Track shown tips to never repeat them
      const newTipIds = response.tipIdsShown || [];
      setShownTipIds(prev => [...prev, ...newTipIds]);
      
      // Update current trick if the response provides one
      if (response.currentTrick) {
        setCurrentTrick(response.currentTrick);
      }
      
      // Add messages with staggered delays for human-like feel
      setLoading(false);  // Stop loading indicator before showing messages
      
      // Only show videos that haven't been shown before
      const videosToShow = uniqueNewVideos.length > 0 ? uniqueNewVideos : [];
      
      for (let i = 0; i < response.messages.length; i++) {
        const msg = response.messages[i];
        const isFirst = i === 0;
        const isTip = msg.type === 'tip';
        
        // Calculate delay: first message quick, tips slower
        const msgDelay = isFirst ? 300 : (isTip ? 600 + (i * 150) : 400);
        
        await delay(msgDelay);
        
        const uiMessage: Message = {
          id: `coach-${Date.now()}-${i}`,
          text: msg.content,
          sender: 'coach',
          messageType: msg.type,
        };
        
        // Show videos after the last message in the response
        const isLast = i === response.messages.length - 1;
        if (isLast && videosToShow.length > 0) {
          uiMessage.videos = videosToShow;
        }
        
        setMessages(prev => [...prev, uiMessage]);
      }
      
      return;  // Skip the finally block's setLoading since we already did it
      
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
            
            {/* Video thumbnails (3 per question, shown after intro) */}
            {msg.videos && msg.videos.length > 0 && (
              <View style={tw`mt-3`}>
                {msg.videos.map((video, idx) => (
                  <TouchableOpacity
                    key={video.videoId}
                    style={tw`bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#333333] ${idx > 0 ? 'mt-2' : ''}`}
                    onPress={() => openVideo(video.url)}
                    activeOpacity={0.8}
                  >
                    <View style={tw`flex-row`}>
                      <View style={tw`relative`}>
                        <Image
                          source={{ uri: video.thumbnail }}
                          style={tw`w-32 h-20`}
                          resizeMode="cover"
                        />
                        {/* Play button overlay */}
                        <View style={tw`absolute inset-0 items-center justify-center`}>
                          <View style={tw`bg-black/60 rounded-full p-1.5`}>
                            <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" />
                          </View>
                        </View>
                      </View>
                      <View style={tw`flex-1 p-2 justify-center`}>
                        <Text style={tw`text-white text-sm`} numberOfLines={2}>
                          {video.videoTitle}
                        </Text>
                        {video.duration && (
                          <Text style={tw`text-[#A0A0A0] text-xs mt-1`}>
                            {formatTimestamp(video.duration)}
                          </Text>
                        )}
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
            <AnimatedBubble sender="coach">
              <View style={tw`bg-[#2D2D2D] p-4 rounded-2xl`}>
                <TypingIndicator />
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
