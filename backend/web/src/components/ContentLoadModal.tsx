import React, { useEffect, useState } from 'react';
import { useGridStore } from '../stores/gridStore';

interface VideoData {
  videoId: string;
  filename: string;
  fps: number;
  duration: number;
  resolution: [number, number];
  frameCount: number;
  createdAt: string;
  originalVideoPath: string;
  overlayVideoPath: string;
}

interface ContentLoadModalProps {
  cellId: string;
  isOpen: boolean;
  onClose: () => void;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function ContentLoadModal({ cellId, isOpen, onClose }: ContentLoadModalProps) {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const updateCell = useGridStore((state) => state.updateCell);

  useEffect(() => {
    if (!isOpen) return;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        const url = `${API_URL}/api/videos`;
        console.log('%c[ContentLoadModal] 📡 Fetching videos from:', 'color: #4ECDC4; font-weight: bold;', url);

        const response = await fetch(url);
        console.log('%c[ContentLoadModal] 📊 Response status:', 'color: #4ECDC4;', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('%c[ContentLoadModal] ✅ Videos fetched:', 'color: #00FF00; font-weight: bold;', {
          count: Array.isArray(data) ? data.length : data.videos?.length || 0,
          data,
        });

        const videoList = Array.isArray(data) ? data : data.videos || [];
        console.log('%c[ContentLoadModal] 📋 Video list:', 'color: #00FF00;', videoList.map((v: any) => ({
          videoId: v.videoId,
          filename: v.filename,
          frameCount: v.frameCount,
          fps: v.fps,
        })));

        setVideos(videoList);
        setSelectedVideo(null);
      } catch (error) {
        console.error('%c[ContentLoadModal] ❌ Failed to fetch videos:', 'color: #FF0000; font-weight: bold;', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [isOpen]);

  const handleLoadOriginalVideo = (video: VideoData) => {
    console.log('%c[ContentLoadModal] 🎬 Loading original video:', 'color: #FF6B6B; font-weight: bold;', {
      videoId: video.videoId,
      videoIdType: typeof video.videoId,
      videoIdIsString: typeof video.videoId === 'string',
      fps: video.fps,
      frameCount: video.frameCount,
      duration: video.duration,
      fullVideo: video,
    });
    updateCell(cellId, {
      contentType: 'video',
      videoId: video.videoId,
      videoMode: 'original',
    });
    onClose();
  };

  const handleLoadOverlayVideo = (video: VideoData) => {
    console.log('%c[ContentLoadModal] 🎬 Loading overlay video:', 'color: #FFB84D; font-weight: bold;', {
      videoId: video.videoId,
      fps: video.fps,
      frameCount: video.frameCount,
      duration: video.duration,
    });
    updateCell(cellId, {
      contentType: 'video',
      videoId: video.videoId,
      videoMode: 'overlay',
    });
    onClose();
  };

  const handleLoadMesh = (video: VideoData) => {
    console.log('%c[ContentLoadModal] 🎭 Loading mesh:', 'color: #4ECDC4; font-weight: bold;', {
      videoId: video.videoId,
      fps: video.fps,
      frameCount: video.frameCount,
    });
    updateCell(cellId, {
      contentType: 'mesh',
      modelId: video.videoId,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>
            Load Content
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>
            Loading videos...
          </div>
        ) : videos.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>
            No videos available
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', height: '100%', minHeight: '400px' }}>
            <div
              style={{
                flex: '0 0 250px',
                overflowY: 'auto',
                borderRight: '1px solid #333',
                paddingRight: '16px',
              }}
            >
              {videos.map((video) => (
                <button
                  key={video.videoId}
                  onClick={() => setSelectedVideo(video)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: selectedVideo?.videoId === video.videoId ? '#4ECDC4' : '#333',
                    color: selectedVideo?.videoId === video.videoId ? '#000' : '#fff',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: selectedVideo?.videoId === video.videoId ? '600' : '400',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVideo?.videoId !== video.videoId) {
                      e.currentTarget.style.backgroundColor = '#444';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVideo?.videoId !== video.videoId) {
                      e.currentTarget.style.backgroundColor = '#333';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {video.filename}
                  </div>
                  <div style={{ fontSize: '10px', color: selectedVideo?.videoId === video.videoId ? '#000' : '#999' }}>
                    {video.frameCount} frames @ {video.fps.toFixed(1)}fps
                  </div>
                </button>
              ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {selectedVideo ? (
                <>
                  <div>
                    <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                      {selectedVideo.filename}
                    </h3>
                    <div style={{ color: '#999', fontSize: '12px', marginBottom: '16px' }}>
                      <div>Frames: {selectedVideo.frameCount}</div>
                      <div>FPS: {selectedVideo.fps.toFixed(2)}</div>
                      <div>Duration: {selectedVideo.duration.toFixed(2)}s</div>
                      <div>Resolution: {selectedVideo.resolution[0]}x{selectedVideo.resolution[1]}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => handleLoadOriginalVideo(selectedVideo)}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#FF6B6B',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FF5252';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FF6B6B';
                      }}
                    >
                      📹 Load Original Video
                    </button>

                    <button
                      onClick={() => handleLoadOverlayVideo(selectedVideo)}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#FFB84D',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFA500';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFB84D';
                      }}
                    >
                      🎬 Load Overlay Video
                    </button>

                    <button
                      onClick={() => handleLoadMesh(selectedVideo)}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#4ECDC4',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#45B7B0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#4ECDC4';
                      }}
                    >
                      🎭 Load 3D Mesh
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>
                  Select a video to view options
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
