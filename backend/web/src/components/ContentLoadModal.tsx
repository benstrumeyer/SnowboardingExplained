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
  originalVideoPath?: string;
  overlayVideoPath?: string;
  role?: 'raw' | 'mesh';
  hasProcessedMesh?: boolean;
  originalVideoUrl?: string;
  overlayVideoUrl?: string;
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
  const [deleting, setDeleting] = useState(false);
  const updateCell = useGridStore((state) => state.updateCell);

  useEffect(() => {
    if (!isOpen) return;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        const url = `${API_URL}/api/videos`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const videoList = Array.isArray(data) ? data : data.videos || [];
        setVideos(videoList);
        setSelectedVideo(null);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [isOpen]);

  const handleLoadOriginalVideo = (video: VideoData) => {
    let videoUrl = `${API_URL}/api/video/${video.videoId}/original`;

    if (video.role === 'mesh' && video.originalVideoUrl) {
      videoUrl = video.originalVideoUrl;
    }

    updateCell(cellId, {
      contentType: 'video',
      videoId: video.videoId,
      videoMode: 'original',
      videoUrl,
    });
    onClose();
  };

  const handleLoadMesh = (video: VideoData) => {
    updateCell(cellId, {
      contentType: 'mesh',
      modelId: video.videoId,
    });
    onClose();
  };

  const handleDeleteVideo = async (video: VideoData) => {
    if (!window.confirm(`Delete "${video.filename}" and all associated data? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const url = `${API_URL}/api/videos/${video.videoId}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setVideos(videos.filter((v) => v.videoId !== video.videoId));
      setSelectedVideo(null);
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Check console for details.');
    } finally {
      setDeleting(false);
    }
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
          maxWidth: '1200px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '600' }}>
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
          <div style={{ color: '#999', textAlign: 'center', padding: '60px' }}>
            Loading videos...
          </div>
        ) : videos.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '60px' }}>
            No videos available
          </div>
        ) : selectedVideo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <button
              onClick={() => setSelectedVideo(null)}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 12px',
                backgroundColor: '#333',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ← Back to Videos
            </button>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: '0 0 300px' }}>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundColor: '#333',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #444',
                  }}
                >
                  <video
                    src={selectedVideo.role === 'mesh' && selectedVideo.originalVideoUrl
                      ? selectedVideo.originalVideoUrl
                      : `${API_URL}/api/video/${selectedVideo.videoId}/original`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                    {selectedVideo.filename}
                  </h3>
                  <div style={{ color: '#999', fontSize: '13px', lineHeight: '1.6' }}>
                    <div>Duration: {selectedVideo.duration.toFixed(2)}s</div>
                    <div>Frames: {selectedVideo.frameCount}</div>
                    <div>FPS: {selectedVideo.fps.toFixed(2)}</div>
                    <div>Resolution: {selectedVideo.resolution[0]}x{selectedVideo.resolution[1]}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button
                    onClick={() => handleLoadOriginalVideo(selectedVideo)}
                    style={{
                      flex: 1,
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
                    📹 Original
                  </button>

                  <button
                    onClick={() => handleLoadMesh(selectedVideo)}
                    style={{
                      flex: 1,
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
                    🎭 3D Mesh
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteVideo(selectedVideo)}
                  disabled={deleting}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#333',
                    color: '#FF4444',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    opacity: deleting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!deleting) {
                      e.currentTarget.style.backgroundColor = '#333';
                    }
                  }}
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
              overflowY: 'auto',
              paddingRight: '8px',
            }}
          >
            {videos.map((video) => (
              <button
                key={video.videoId}
                onClick={() => setSelectedVideo(video)}
                style={{
                  backgroundColor: '#222',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4ECDC4';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundColor: '#333',
                    overflow: 'hidden',
                  }}
                >
                  <video
                    src={video.role === 'mesh' && video.originalVideoUrl
                      ? video.originalVideoUrl
                      : `${API_URL}/api/video/${video.videoId}/original`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {video.filename}
                  </div>
                  <div style={{ color: '#999', fontSize: '11px', lineHeight: '1.4' }}>
                    <div>{video.duration.toFixed(1)}s</div>
                    <div>{video.frameCount} frames @ {video.fps.toFixed(0)}fps</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
