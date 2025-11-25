/**
 * Question Flow Screen
 * Simple MVP - just asks for trick name and issues
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import type { UserContext } from '../types';

interface Props {
  onComplete: (context: UserContext) => void;
}

export default function QuestionFlowScreen({ onComplete }: Props) {
  const [trick, setTrick] = useState('');
  const [issues, setIssues] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!trick.trim()) {
      alert('Please enter a trick name');
      return;
    }

    const context: UserContext = {
      trick: trick.trim(),
      issues: issues.trim() || undefined,
    };

    onComplete(context);
  };

  return (
    <ScrollView style={tw`flex-1 bg-white`}>
      <View style={tw`p-6`}>
        {/* Header */}
        <Text style={tw`text-3xl font-bold text-gray-900 mb-2`}>
          🏂 Snowboarding Coach
        </Text>
        <Text style={tw`text-gray-600 mb-8`}>
          Let's get you some coaching advice!
        </Text>

        {/* Question 1: Trick */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-2`}>
            What trick do you want to learn?
          </Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-4 text-base`}
            placeholder="e.g., backside 180, carving, method..."
            value={trick}
            onChangeText={setTrick}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Question 2: Issues (optional) */}
        <View style={tw`mb-8`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-2`}>
            What issues are you having? (optional)
          </Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-4 text-base min-h-24`}
            placeholder="e.g., not getting enough rotation, catching edges..."
            value={issues}
            onChangeText={setIssues}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={tw`bg-blue-500 rounded-lg p-4 items-center ${!trick.trim() ? 'opacity-50' : ''}`}
          onPress={handleSubmit}
          disabled={!trick.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white text-lg font-semibold`}>
              Get Coaching Advice
            </Text>
          )}
        </TouchableOpacity>

        {/* Info */}
        <Text style={tw`text-gray-500 text-sm text-center mt-4`}>
          Your AI coach will analyze your situation and provide personalized advice
        </Text>
      </View>
    </ScrollView>
  );
}
