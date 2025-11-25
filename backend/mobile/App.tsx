/**
 * Snowboarding Coach App
 * MVP: Simple question flow → AI coaching response
 */

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import tw from 'twrnc';
import QuestionFlowScreen from './src/screens/QuestionFlowScreen';
import ChatScreen from './src/screens/ChatScreen';
import type { UserContext } from './src/types';

export default function App() {
  const [context, setContext] = useState<UserContext | null>(null);

  const handleQuestionComplete = (userContext: UserContext) => {
    setContext(userContext);
  };

  const handleBack = () => {
    setContext(null);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar style="dark" />
      
      {context ? (
        <ChatScreen context={context} onBack={handleBack} />
      ) : (
        <QuestionFlowScreen onComplete={handleQuestionComplete} />
      )}
    </SafeAreaView>
  );
}
