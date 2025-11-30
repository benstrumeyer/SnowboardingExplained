/**
 * Voice Input Component
 * Microphone button with real-time transcription display
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { getVoiceService, VoiceState } from '../services/voice';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    partialTranscript: '',
    error: null,
  });
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const voiceService = getVoiceService();

  useEffect(() => {
    const unsubscribe = voiceService.subscribe(setVoiceState);
    return () => unsubscribe();
  }, []);

  // Pulse animation when listening
  useEffect(() => {
    if (voiceState.isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState.isListening]);

  // Send transcript when speech ends
  useEffect(() => {
    if (!voiceState.isListening && voiceState.transcript) {
      onTranscript(voiceState.transcript);
    }
  }, [voiceState.isListening, voiceState.transcript]);

  const handlePress = useCallback(async () => {
    if (disabled) return;

    if (voiceState.isListening) {
      await voiceService.stopListening();
    } else {
      await voiceService.startListening();
    }
  }, [voiceState.isListening, disabled]);

  const displayText = voiceState.partialTranscript || voiceState.transcript;

  return (
    <View style={styles.container}>
      {/* Transcription display */}
      {displayText ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText}>{displayText}</Text>
        </View>
      ) : null}

      {/* Error display */}
      {voiceState.error ? (
        <Text style={styles.errorText}>{voiceState.error}</Text>
      ) : null}

      {/* Microphone button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.micButton,
            voiceState.isListening && styles.micButtonActive,
            disabled && styles.micButtonDisabled,
          ]}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>
            {voiceState.isListening ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Status text */}
      <Text style={styles.statusText}>
        {voiceState.isListening 
          ? 'Listening... Tap to stop' 
          : 'Tap to speak'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxWidth: '100%',
  },
  transcriptText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 10,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4a9eff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4a9eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: '#ff6b6b',
    shadowColor: '#ff6b6b',
  },
  micButtonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
  },
  micIcon: {
    fontSize: 32,
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
});

export default VoiceInput;
