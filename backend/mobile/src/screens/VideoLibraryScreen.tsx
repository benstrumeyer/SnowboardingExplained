/**
 * Video Library Screen
 * Grid of all Taevis videos with search functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import tw from 'twrnc';
import { API_URL } from '../config';

interface Video {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

export default function VideoLibraryScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/videos`);
      const data = await response.json();
      setVideos(data.videos || []);
      setError(null);
    } catch (err: any) {
      setError('Failed to load videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter videos based on search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) {
      return videos;
    }
    const query = searchQuery.toLowerCase();
    return videos.filter(video =>
      video.title.toLowerCase().includes(query)
    );
  }, [searchQuery, videos]);

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  // Use smaller thumbnail (mqdefault = 320x180, much faster than maxresdefault)
  const getSmallThumbnail = (videoId: string) => 
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  // Switch to full-width cards when less than 20 videos
  const useFullWidth = filteredVideos.length < 20;

  // Grid view (3 columns) for many videos
  const renderGridVideo = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={tw`flex-1 m-1`}
      onPress={() => openVideo(item.url)}
      activeOpacity={0.8}
    >
      <View style={tw`bg-gray-800 rounded-lg overflow-hidden`}>
        <Image
          source={{ uri: getSmallThumbnail(item.videoId) }}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          resizeMode="cover"
        />
        <View style={tw`p-2`}>
          <Text style={tw`text-white text-xs`} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Full-width card for fewer videos (horizontal layout, 1/3 thumbnail + 2/3 text)
  const renderFullWidthVideo = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={tw`mx-2 my-1`}
      onPress={() => openVideo(item.url)}
      activeOpacity={0.8}
    >
      <View style={tw`bg-gray-800 rounded-lg overflow-hidden flex-row h-20`}>
        <View style={{ flex: 1 }}>
          <Image
            source={{ uri: getSmallThumbnail(item.videoId) }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
        <View style={[tw`p-3 justify-center`, { flex: 2 }]}>
          <Text style={tw`text-white text-sm`} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={tw`flex-1 bg-gray-900`}>
      {/* Header */}
      <View style={tw`bg-gray-800 pt-12 pb-4 px-4`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-12`} />{/* Space for hamburger menu from App.tsx */}
          <Text style={tw`text-white text-xl font-bold`}>
            📹 Video Library
          </Text>
        </View>
        
        {/* Search Input */}
        <TextInput
          style={tw`bg-gray-700 text-white px-4 py-3 rounded-lg`}
          placeholder="Search videos..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Video Count */}
      <View style={tw`px-4 py-2`}>
        <Text style={tw`text-gray-400 text-sm`}>
          {filteredVideos.length} videos
        </Text>
      </View>

      {/* Video Grid */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#4a9eff" />
          <Text style={tw`text-gray-400 mt-4`}>Loading videos...</Text>
        </View>
      ) : error ? (
        <View style={tw`flex-1 items-center justify-center px-4`}>
          <Text style={tw`text-red-400 text-center mb-4`}>{error}</Text>
          <TouchableOpacity
            style={tw`bg-blue-500 px-6 py-3 rounded-lg`}
            onPress={fetchVideos}
          >
            <Text style={tw`text-white font-bold`}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : useFullWidth ? (
        <FlatList
          key="full-width"
          data={filteredVideos}
          renderItem={renderFullWidthVideo}
          keyExtractor={(item) => item.videoId}
          contentContainerStyle={tw`pb-4`}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={tw`flex-1 items-center justify-center py-20`}>
              <Text style={tw`text-gray-400 text-center`}>
                {searchQuery ? `No videos found for "${searchQuery}"` : 'No videos available'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="grid"
          data={filteredVideos}
          renderItem={renderGridVideo}
          keyExtractor={(item) => item.videoId}
          numColumns={3}
          columnWrapperStyle={tw`justify-between`}
          contentContainerStyle={tw`px-2 pb-4`}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={tw`flex-1 items-center justify-center py-20`}>
              <Text style={tw`text-gray-400 text-center`}>
                {searchQuery ? `No videos found for "${searchQuery}"` : 'No videos available'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
