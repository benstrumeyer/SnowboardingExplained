/**
 * Snowboarding Coach App
 * Conversational chat interface with sidebar navigation
 */

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import tw from 'twrnc';
import ChatScreen from './src/screens/ChatScreen';
import VideoLibraryScreen from './src/screens/VideoLibraryScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

type Screen = 'chat' | 'videos';
type InputMode = 'text' | 'voice';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('chat');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const translateX = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
    setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    if (sidebarOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    closeSidebar();
  };

  const selectMode = (mode: InputMode) => {
    setInputMode(mode);
    setCurrentScreen('chat');
    closeSidebar();
  };

  return (
    <View style={tw`flex-1 bg-gray-900`}>
      <StatusBar style="light" />
      
      {/* Main Content */}
      <View style={tw`flex-1`}>
        {/* Hamburger Menu Button */}
        <TouchableOpacity
          style={tw`absolute top-12 left-4 z-50 p-2`}
          onPress={toggleSidebar}
        >
          <Text style={tw`text-white text-2xl`}>☰</Text>
        </TouchableOpacity>

        {/* Screen Content */}
        {currentScreen === 'chat' && <ChatScreen />}
        {currentScreen === 'videos' && <VideoLibraryScreen />}
      </View>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <Animated.View
          style={[
            tw`absolute inset-0 bg-black`,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={tw`flex-1`}
            onPress={toggleSidebar}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          tw`absolute top-0 left-0 bottom-0 bg-gray-800 pt-12 px-4`,
          {
            width: SIDEBAR_WIDTH,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Header */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-white text-2xl font-bold`}>Snowboarding</Text>
          <Text style={tw`text-blue-400 text-2xl font-bold`}>Explained</Text>
        </View>

        {/* Input Mode Section */}
        <Text style={tw`text-gray-400 text-xs uppercase tracking-wide mb-3`}>
          Chat Mode
        </Text>
        
        <TouchableOpacity
          style={tw`flex-row items-center py-3 px-4 rounded-lg mb-2 ${
            inputMode === 'text' && currentScreen === 'chat' ? 'bg-blue-500/20' : ''
          }`}
          onPress={() => selectMode('text')}
        >
          <Text style={tw`text-xl mr-3`}>💬</Text>
          <Text style={tw`${
            inputMode === 'text' && currentScreen === 'chat' ? 'text-blue-400' : 'text-gray-300'
          } text-base`}>
            Text Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`flex-row items-center py-3 px-4 rounded-lg mb-4 ${
            inputMode === 'voice' && currentScreen === 'chat' ? 'bg-blue-500/20' : ''
          }`}
          onPress={() => selectMode('voice')}
        >
          <Text style={tw`text-xl mr-3`}>🎤</Text>
          <Text style={tw`${
            inputMode === 'voice' && currentScreen === 'chat' ? 'text-blue-400' : 'text-gray-300'
          } text-base`}>
            Voice Chat
          </Text>
        </TouchableOpacity>

        {/* Separator */}
        <View style={tw`h-px bg-gray-700 my-4`} />

        {/* Video Library */}
        <TouchableOpacity
          style={tw`flex-row items-center py-3 px-4 rounded-lg ${
            currentScreen === 'videos' ? 'bg-blue-500/20' : ''
          }`}
          onPress={() => navigateTo('videos')}
        >
          <Text style={tw`text-xl mr-3`}>📹</Text>
          <Text style={tw`${
            currentScreen === 'videos' ? 'text-blue-400' : 'text-gray-300'
          } text-base`}>
            Video Library
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
