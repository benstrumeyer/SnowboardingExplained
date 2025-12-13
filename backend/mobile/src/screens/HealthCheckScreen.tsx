import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { checkHealth, getApiUrl } from '../services/api';

export function HealthCheckScreen() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState('Checking backend connection...');
  const [uptime, setUptime] = useState<number | undefined>();
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    setApiUrl(getApiUrl());
    performHealthCheck();
  }, []);

  const performHealthCheck = async () => {
    setStatus('checking');
    setMessage('Checking backend connection...');
    
    const result = await checkHealth();
    
    if (result.ok) {
      setStatus('ok');
      setMessage('✅ Backend is running and healthy!');
      setUptime(result.uptime);
    } else {
      setStatus('error');
      setMessage(`❌ Backend connection failed: ${result.message}`);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <View className="mt-8">
        <Text className="text-white text-2xl font-bold mb-4">Backend Health Check</Text>
        
        {/* API URL */}
        <View className="bg-gray-800 rounded-lg p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-2">API URL</Text>
          <Text className="text-white font-mono text-xs break-words">{apiUrl}</Text>
        </View>

        {/* Status */}
        <View className="bg-gray-800 rounded-lg p-6 mb-4 items-center">
          {status === 'checking' && (
            <>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-white mt-4">{message}</Text>
            </>
          )}
          
          {status === 'ok' && (
            <>
              <Text className="text-4xl mb-2">✅</Text>
              <Text className="text-green-400 text-lg font-bold">{message}</Text>
              {uptime !== undefined && (
                <Text className="text-gray-400 text-sm mt-2">
                  Server uptime: {Math.floor(uptime)}s
                </Text>
              )}
            </>
          )}
          
          {status === 'error' && (
            <>
              <Text className="text-4xl mb-2">❌</Text>
              <Text className="text-red-400 text-lg font-bold text-center">{message}</Text>
              <Text className="text-gray-400 text-xs mt-4 text-center">
                Make sure the backend server is running on port 3001
              </Text>
            </>
          )}
        </View>

        {/* Retry Button */}
        <TouchableOpacity
          onPress={performHealthCheck}
          className="bg-blue-600 rounded-lg p-4 items-center mb-4"
        >
          <Text className="text-white font-bold">Retry Connection</Text>
        </TouchableOpacity>

        {/* Troubleshooting */}
        <View className="bg-gray-800 rounded-lg p-4">
          <Text className="text-white font-bold mb-3">Troubleshooting</Text>
          <Text className="text-gray-300 text-sm mb-2">
            1. Ensure backend is running: npm run dev
          </Text>
          <Text className="text-gray-300 text-sm mb-2">
            2. Check your machine's IP address
          </Text>
          <Text className="text-gray-300 text-sm mb-2">
            3. Update API_URL in config.ts with your machine's IP
          </Text>
          <Text className="text-gray-300 text-sm">
            4. Ensure phone and computer are on same network
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
