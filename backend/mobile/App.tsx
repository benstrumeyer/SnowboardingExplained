/**
 * Snowboarding Coach App
 * Conversational chat interface with sidebar navigation
 * Swipe from left edge to open drawer
 */

import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';
import tw from 'twrnc';
import ChatScreen from './src/screens/ChatScreen';
import VideoLibraryScreen from './src/screens/VideoLibraryScreen';

type Screen = 'chat' | 'videos';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const EDGE_WIDTH = 30; // Width of left edge that triggers swipe

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('chat');
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -DRAWER_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  };

  // Pan responder for opening drawer (swipe from left edge)
  const openPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        return !drawerOpen && evt.nativeEvent.pageX < EDGE_WIDTH;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          !drawerOpen &&
          evt.nativeEvent.pageX < EDGE_WIDTH + 20 &&
          gestureState.dx > 10 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          const newValue = Math.min(0, -DRAWER_WIDTH + gestureState.dx);
          slideAnim.setValue(newValue);
          fadeAnim.setValue(Math.min(1, gestureState.dx / DRAWER_WIDTH));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > DRAWER_WIDTH * 0.3 || gestureState.vx > 0.5) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
    })
  ).current;

  // Pan responder for closing drawer (swipe left on drawer)
  const closePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          const newValue = Math.max(-DRAWER_WIDTH, gestureState.dx);
          slideAnim.setValue(newValue);
          fadeAnim.setValue(Math.max(0, 1 + gestureState.dx / DRAWER_WIDTH));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -DRAWER_WIDTH * 0.3 || gestureState.vx < -0.5) {
          closeDrawer();
        } else {
          openDrawer();
        }
      },
    })
  ).current;

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
    closeDrawer();
  };

  return (
    <View style={tw`flex-1 bg-gray-900`} {...openPanResponder.panHandlers}>
      <StatusBar style="light" />

      {/* Main Content */}
      <View style={tw`flex-1`}>
        {/* Hamburger Menu Button */}
        <TouchableOpacity
          style={tw`absolute top-12 left-4 z-40 p-2`}
          onPress={openDrawer}
        >
          <Text style={tw`text-white text-2xl`}>☰</Text>
        </TouchableOpacity>

        {/* Screen Content */}
        {currentScreen === 'chat' && <ChatScreen />}
        {currentScreen === 'videos' && <VideoLibraryScreen />}
      </View>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View
            style={[
              tw`absolute inset-0 bg-black z-50`,
              { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer - always rendered but off-screen when closed */}
      <Animated.View
        {...closePanResponder.panHandlers}
        style={[
          tw`absolute top-0 bottom-0 left-0 bg-gray-800 z-50 pt-12 px-4`,
          { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={tw`absolute top-12 right-4 p-2 z-10`}
          onPress={closeDrawer}
        >
          <Text style={tw`text-white text-2xl`}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-white text-2xl font-bold`}>🏂 Taevis</Text>
        </View>

        <ScrollView style={tw`flex-1`}>
          {/* Chat Section */}
          <Text style={tw`text-gray-400 text-xs uppercase tracking-wide mb-3`}>
            Chat
          </Text>

          <TouchableOpacity
            style={tw`flex-row items-center py-3 px-4 rounded-lg mb-2 ${
              currentScreen === 'chat' ? 'bg-blue-900/50' : ''
            }`}
            onPress={() => navigateTo('chat')}
          >
            <Text style={tw`text-xl mr-3`}>💬</Text>
            <Text
              style={tw`${
                currentScreen === 'chat' ? 'text-blue-400' : 'text-gray-300'
              } text-base`}
            >
              Text Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-row items-center py-3 px-4 rounded-lg mb-2 opacity-50`}
            disabled
          >
            <Text style={tw`text-xl mr-3`}>🎤</Text>
            <Text style={tw`text-gray-500 text-base`}>
              Voice Chat (Coming Soon)
            </Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={tw`h-px bg-gray-700 my-4`} />

          {/* Video Library */}
          <TouchableOpacity
            style={tw`flex-row items-center py-3 px-4 rounded-lg ${
              currentScreen === 'videos' ? 'bg-blue-900/50' : ''
            }`}
            onPress={() => navigateTo('videos')}
          >
            <Text style={tw`text-xl mr-3`}>📹</Text>
            <Text
              style={tw`${
                currentScreen === 'videos' ? 'text-blue-400' : 'text-gray-300'
              } text-base`}
            >
              Video Library
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
