/**
 * Video Library Screen
 * Carousel of all Taevis videos with search functionality
 * Swipeable cards with snap carousel
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Carousel from 'react-native-snap-carousel-v4';
import tw from 'twrnc';
import { API_URL } from '../config';
import { useAppDispatch } from '../hooks/useAppDispatch';
import type { RootState } from '../store/store';
import {
  setSelectedVideo,
  setIsModalOpen,
  setCarouselVideos,
  setSelectedVideoIndex,
  resetVideoState,
} from '../store/videoSlice';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';

interface Video {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

interface VideoDetails {
  videoId: string;
  title: string;
  duration: number;
  url: string;
  thumbnail: string;
  tips: string[];
}

export default function VideoLibraryScreen() {
  const dispatch = useAppDispatch();
  const { selectedVideo, isModalOpen, carouselVideos, selectedVideoIndex } = useSelector(
    (state: RootState) => state.video
  );

  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingVideoIds, setLoadingVideoIds] = useState<Set<string>>(new Set());
  const carouselRef = useRef<Carousel<any>>(null);
  const { width: screenWidth } = Dimensions.get('window');

  // Fetch videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  // Snap carousel to the selected index when modal opens or index changes
  useEffect(() => {
    if (isModalOpen && carouselRef.current && selectedVideoIndex >= 0 && carouselVideos.length > 0) {
      setTimeout(() => {
        carouselRef.current?.snapToItem(selectedVideoIndex, false);
      }, 100);
    }
  }, [isModalOpen, selectedVideoIndex, carouselVideos.length]);

  // Update carousel data when selectedVideo changes (from API fetch)
  useEffect(() => {
    if (selectedVideo && carouselVideos.length > 0 && selectedVideoIndex >= 0) {
      const updatedCarousel = [...carouselVideos];
      updatedCarousel[selectedVideoIndex] = selectedVideo;
      dispatch(setCarouselVideos(updatedCarousel));
    }
  }, [selectedVideo, selectedVideoIndex]);

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

  const fetchVideoDetails = async (videoId: string) => {
    try {
      setLoadingVideoIds(prev => new Set(prev).add(videoId));
      console.log('Fetching details for videoId:', videoId);
      const response = await fetch(`${API_URL}/api/video-details?videoId=${videoId}`);
      const data = await response.json();
      console.log('Received video details:', data);
      dispatch(setSelectedVideo(data));
      setLoadingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    } catch (err) {
      console.error('Error fetching video details:', err);
      setLoadingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleVideoCardPress = (videoId: string) => {
    // Clear everything first for clean state
    dispatch(setSelectedVideo(null));
    dispatch(setCarouselVideos([]));
    
    // Load carousel with filtered videos in grid order
    const videoDetailsArray: VideoDetails[] = filteredVideos.map(v => ({
      ...v,
      duration: 0,
      tips: [],
    }));
    dispatch(setCarouselVideos(videoDetailsArray));
    
    // Find the clicked video's index in the filtered list
    const clickedIndex = filteredVideos.findIndex(v => v.videoId === videoId);
    dispatch(setSelectedVideoIndex(clickedIndex >= 0 ? clickedIndex : 0));
    
    dispatch(setIsModalOpen(true));
    fetchVideoDetails(videoId);
  };

  const closeModal = () => {
    dispatch(resetVideoState());
    dispatch(setIsModalOpen(false));
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Grid card renderer
  const renderGridVideo = ({ item }: { item: Video }) => (
    <View style={tw`flex-1 m-1`}>
      <TouchableOpacity
        onPress={() => handleVideoCardPress(item.videoId)}
        activeOpacity={0.8}
      >
        <View style={tw`bg-gray-800 rounded-lg overflow-hidden`}>
          <Image
            source={{ uri: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` }}
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
    </View>
  );



  return (
    <View style={tw`flex-1 bg-gray-900`}>
      {/* Header */}
      <View style={tw`bg-gray-800 pt-12 pb-4 px-4`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-12`} />
          <Text style={tw`text-white text-xl font-bold`}>Video Library</Text>
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
      ) : filteredVideos.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <Text style={tw`text-gray-400 text-center`}>
            {searchQuery
              ? `No videos found for "${searchQuery}"`
              : 'No videos available'}
          </Text>
        </View>
      ) : (
        <FlatList
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
        />
      )}

      {/* Video Details Modal with Carousel */}
      <Modal
        visible={isModalOpen && carouselVideos.length > 0 && selectedVideoIndex >= 0}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={tw`flex-1 bg-black/80`}>
          <View style={tw`flex-1 justify-center items-center px-4`}>
            {/* Close Button */}
            <TouchableOpacity
              style={tw`absolute top-15 right-6 z-20 bg-black/50 rounded-full p-2`}
              onPress={closeModal}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Carousel */}
            <View style={tw`w-full max-h-[85%]`}>
              <Carousel
                ref={carouselRef}
                data={carouselVideos}
                renderItem={({ item }: { item: VideoDetails }) => {
                  const isLoading = loadingVideoIds.has(item.videoId) && (!item.duration || item.tips.length === 0);
                  return (
                    <View style={tw`bg-[#141414] rounded-2xl overflow-hidden`}>
                      <VideoCard
                        title={item.title}
                        thumbnail={item.thumbnail}
                        duration={item.duration}
                        tips={item.tips}
                        videoUrl={item.url}
                        formatDuration={formatDuration}
                        isLoading={isLoading}
                      />
                    </View>
                  );
                }}
                sliderWidth={screenWidth - 32}
                itemWidth={screenWidth - 32}
                onSnapToItem={(index: number) => {
                  dispatch(setSelectedVideoIndex(index));
                  // Clear previous video to show skeleton while loading new one
                  dispatch(setSelectedVideo(null));
                  if (carouselVideos[index]) {
                    fetchVideoDetails(carouselVideos[index].videoId);
                  }
                }}
                activeSlideAlignment="center"
                inactiveSlideScale={0.9}
                inactiveSlideOpacity={0.6}
                scrollEnabled={carouselVideos.length > 1}
                vertical={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
