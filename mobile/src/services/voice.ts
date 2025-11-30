/**
 * Voice Input Service
 * Handles speech-to-text transcription
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * Uses react-native-voice for mobile
 * Falls back to Web Speech API for web
 */

import { Platform } from 'react-native';

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
}

export type VoiceCallback = (state: VoiceState) => void;

let Voice: any = null;
let webSpeechRecognition: any = null;

// Try to load react-native-voice
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {
  console.log('react-native-voice not available, will use Web Speech API');
}

/**
 * Voice Input Service class
 */
export class VoiceInputService {
  private state: VoiceState = {
    isListening: false,
    transcript: '',
    partialTranscript: '',
    error: null,
  };
  
  private callbacks: Set<VoiceCallback> = new Set();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    if (Voice) {
      // React Native Voice setup
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Web Speech API setup
      const SpeechRecognition = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        webSpeechRecognition = new SpeechRecognition();
        webSpeechRecognition.continuous = true;
        webSpeechRecognition.interimResults = true;
        webSpeechRecognition.lang = 'en-US';

        webSpeechRecognition.onstart = this.onSpeechStart.bind(this);
        webSpeechRecognition.onend = this.onSpeechEnd.bind(this);
        webSpeechRecognition.onresult = this.onWebSpeechResult.bind(this);
        webSpeechRecognition.onerror = this.onWebSpeechError.bind(this);
      }
    }

    this.initialized = true;
  }

  /**
   * Subscribe to voice state changes
   */
  subscribe(callback: VoiceCallback): () => void {
    this.callbacks.add(callback);
    callback(this.state);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(): void {
    for (const callback of this.callbacks) {
      callback({ ...this.state });
    }
  }

  private updateState(updates: Partial<VoiceState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyCallbacks();
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<void> {
    try {
      this.updateState({
        isListening: true,
        transcript: '',
        partialTranscript: '',
        error: null,
      });

      if (Voice) {
        await Voice.start('en-US');
      } else if (webSpeechRecognition) {
        webSpeechRecognition.start();
      } else {
        throw new Error('Voice recognition not available');
      }
    } catch (error: any) {
      this.updateState({
        isListening: false,
        error: error.message || 'Failed to start voice recognition',
      });
    }
  }

  /**
   * Stop listening for voice input
   */
  async stopListening(): Promise<void> {
    try {
      if (Voice) {
        await Voice.stop();
      } else if (webSpeechRecognition) {
        webSpeechRecognition.stop();
      }
      
      this.updateState({ isListening: false });
    } catch (error: any) {
      this.updateState({
        isListening: false,
        error: error.message || 'Failed to stop voice recognition',
      });
    }
  }

  /**
   * Cancel voice recognition
   */
  async cancel(): Promise<void> {
    try {
      if (Voice) {
        await Voice.cancel();
      } else if (webSpeechRecognition) {
        webSpeechRecognition.abort();
      }
      
      this.updateState({
        isListening: false,
        transcript: '',
        partialTranscript: '',
      });
    } catch (error: any) {
      console.error('Error canceling voice:', error);
    }
  }

  /**
   * Get current transcript
   */
  getTranscript(): string {
    return this.state.transcript || this.state.partialTranscript;
  }

  /**
   * Check if voice recognition is available
   */
  isAvailable(): boolean {
    return Voice !== null || webSpeechRecognition !== null;
  }

  // Event handlers for react-native-voice
  private onSpeechStart(): void {
    this.updateState({ isListening: true });
  }

  private onSpeechEnd(): void {
    this.updateState({ isListening: false });
  }

  private onSpeechResults(event: any): void {
    const transcript = event.value?.[0] || '';
    this.updateState({ transcript, partialTranscript: '' });
  }

  private onSpeechPartialResults(event: any): void {
    const partialTranscript = event.value?.[0] || '';
    this.updateState({ partialTranscript });
  }

  private onSpeechError(event: any): void {
    this.updateState({
      isListening: false,
      error: event.error?.message || 'Speech recognition error',
    });
  }

  // Event handlers for Web Speech API
  private onWebSpeechResult(event: any): void {
    let transcript = '';
    let partialTranscript = '';

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        transcript += result[0].transcript;
      } else {
        partialTranscript += result[0].transcript;
      }
    }

    this.updateState({ transcript, partialTranscript });
  }

  private onWebSpeechError(event: any): void {
    this.updateState({
      isListening: false,
      error: event.error || 'Speech recognition error',
    });
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    if (Voice) {
      await Voice.destroy();
      Voice.removeAllListeners();
    }
    if (webSpeechRecognition) {
      webSpeechRecognition.abort();
    }
    this.callbacks.clear();
  }
}

// Singleton instance
let voiceService: VoiceInputService | null = null;

export function getVoiceService(): VoiceInputService {
  if (!voiceService) {
    voiceService = new VoiceInputService();
  }
  return voiceService;
}

export default VoiceInputService;
