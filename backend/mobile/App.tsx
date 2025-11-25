/**
 * Snowboarding Coach App
 * Conversational chat interface
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import tw from 'twrnc';
import ChatScreen from './src/screens/ChatScreen';

export default function App() {
  return (
    <View style={tw`flex-1`}>
      <StatusBar style="light" />
      <ChatScreen />
    </View>
  );
}
