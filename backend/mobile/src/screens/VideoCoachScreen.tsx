import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { config } from '../config';

interface AnalysisResult {
  videoId: string;
  filename: string;
  frameCount: number;
  duration: number;
  trick: {
    name: string;
    rotationDirection: string;
    rotationCount: number;
    difficulty: string;
    confidence: number;
    description: string;
  };
  frames: Array<{
    frameNumber: number;
    timestamp: number;
    imagePath: string;
  }>;
}

export const VideoCoachScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickVideo = async () => {
    try {
      console.log('[VideoCoach] Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1
      });

      console.log('[VideoCoach] Picker result:', result);
      console.log('[VideoCoach] Canceled:', result.canceled);
      console.log('[VideoCoach] Assets:', result.assets);

      if (!result.canceled && result.assets[0]) {
        console.log('[VideoCoach] Video selected:', result.assets[0].uri);
        uploadVideo(result.assets[0].uri);
      } else {
        console.log('[VideoCoach] Video selection canceled');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Picker error:', err);
      console.error('[VideoCoach] Error message:', err.message);
      setError(`Failed to pick video: ${err.message || err}`);
    }
  };

  const uploadVideo = async (videoUri: string) => {
    try {
      console.log('[VideoCoach] Starting upload...');
      console.log('[VideoCoach] Video URI:', videoUri);
      
      setLoading(true);
      setError(null);

      console.log('[VideoCoach] Creating FormData...');
      const formData = new FormData();
      
      // React Native FormData expects a file object with uri, type, and name
      const videoFile = {
        uri: videoUri,
        type: 'video/mp4',
        name: 'trick-video.mp4'
      };
      
      console.log('[VideoCoach] Video file object:', videoFile);
      formData.append('video', videoFile as any);
      console.log('[VideoCoach] FormData prepared');

      const uploadUrl = `${config.apiUrl}/api/video/upload`;
      console.log('[VideoCoach] Sending to backend at:', uploadUrl);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('[VideoCoach] Upload response status:', uploadResponse.status);
      console.log('[VideoCoach] Upload response ok:', uploadResponse.ok);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[VideoCoach] Upload error response:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const result = await uploadResponse.json();
      console.log('[VideoCoach] Upload result:', result);

      if (result.success) {
        console.log('[VideoCoach] Analysis successful:', result.data);
        setAnalysis(result.data);
        setSelectedFrame(0);
      } else {
        console.error('[VideoCoach] Upload returned error:', result.error);
        setError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('[VideoCoach] Upload error:', err);
      console.error('[VideoCoach] Error message:', err.message);
      console.error('[VideoCoach] Error stack:', err.stack);
      setError(`Upload error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Analyzing video...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={pickVideo}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Video Trick Coach</Text>
        <Text style={styles.subtitle}>Upload a snowboarding video to analyze your trick</Text>
        <TouchableOpacity style={styles.button} onPress={pickVideo}>
          <Text style={styles.buttonText}>Select Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{analysis.trick.name}</Text>
        <Text style={styles.subtitle}>{analysis.trick.description}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Rotations</Text>
          <Text style={styles.statValue}>{analysis.trick.rotationCount.toFixed(1)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Direction</Text>
          <Text style={styles.statValue}>{analysis.trick.rotationDirection}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Difficulty</Text>
          <Text style={styles.statValue}>{analysis.trick.difficulty}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Confidence</Text>
          <Text style={styles.statValue}>{(analysis.trick.confidence * 100).toFixed(0)}%</Text>
        </View>
      </View>

      <View style={styles.frameContainer}>
        <Text style={styles.frameTitle}>Frame {selectedFrame + 1} / {analysis.frames.length}</Text>
        {analysis.frames[selectedFrame] && (
          <Image
            source={{ uri: analysis.frames[selectedFrame].imagePath }}
            style={styles.frameImage}
          />
        )}
      </View>

      <View style={styles.frameSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {analysis.frames.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.frameThumbnail,
                selectedFrame === idx && styles.frameThumbnailActive
              ]}
              onPress={() => setSelectedFrame(idx)}
            >
              <Text style={styles.frameThumbnailText}>{idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.button} onPress={pickVideo}>
        <Text style={styles.buttonText}>Analyze Another Video</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 20
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8
  },
  stat: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  frameContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden'
  },
  frameTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 10,
    backgroundColor: '#f0f0f0'
  },
  frameImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#000'
  },
  frameSelector: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10
  },
  frameThumbnail: {
    width: 50,
    height: 50,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  frameThumbnailActive: {
    backgroundColor: '#1976d2',
    borderWidth: 2,
    borderColor: '#0d47a1'
  },
  frameThumbnailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333'
  },
  button: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});
