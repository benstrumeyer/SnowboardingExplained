import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/VideoUploadModal.css';

interface VideoUploadModalProps {
  isOpen: boolean;
  role: 'rider' | 'reference';
  onClose: () => void;
  onVideoLoaded: (videoId: string, role: 'rider' | 'coach') => void;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  role,
  onClose,
  onVideoLoaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('role', role);

      console.log('[UPLOAD] Starting video upload...');

      // Upload video
      const uploadResponse = await axios.post(`${API_URL}/api/upload-video-with-pose`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minute timeout
        onUploadProgress: (progressEvent) => {
          const progress = 10 + Math.round((progressEvent.loaded / (progressEvent.total || 1)) * 40);
          setUploadProgress(progress);
        },
      });

      console.log('[UPLOAD] Upload response:', uploadResponse.data);
      const { videoId, status, frameCount } = uploadResponse.data;

      if (!videoId) {
        throw new Error('No videoId returned from upload');
      }

      console.log(`[UPLOAD] Got videoId: ${videoId}`);

      // If already complete, we're done
      if (status !== 'processing' && frameCount > 0) {
        console.log(`[UPLOAD] ✓ Upload complete with ${frameCount} frames`);
        setUploadProgress(100);
        onVideoLoaded(videoId, role === 'rider' ? 'rider' : 'coach');
        resetForm();
        return;
      }

      // Poll for completion
      console.log('[UPLOAD] Polling for job completion...');
      setUploadProgress(60);
      
      for (let i = 0; i < 600; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const statusResponse = await axios.get(`${API_URL}/api/job-status/${videoId}`, {
            timeout: 10000,
          });

          const jobStatus = statusResponse.data.status;
          console.log(`[UPLOAD] Poll ${i + 1}: status=${jobStatus}`);

          setUploadProgress(60 + Math.min((i / 600) * 40, 39));

          if (jobStatus === 'complete') {
            console.log('[UPLOAD] ✓ Job complete!');
            setUploadProgress(100);
            onVideoLoaded(videoId, role === 'rider' ? 'rider' : 'coach');
            resetForm();
            return;
          } else if (jobStatus === 'error') {
            throw new Error(statusResponse.data.error || 'Processing failed');
          }
        } catch (err: any) {
          if (err.response?.status === 404) {
            // Job not found yet, keep polling
            continue;
          }
          if (err.message?.includes('Processing failed')) {
            throw err;
          }
          console.warn('[UPLOAD] Poll error:', err.message);
        }
      }

      throw new Error('Video processing timeout');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('[UPLOAD] Error:', err);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const roleLabel = role === 'rider' ? 'Rider' : 'Reference/Coach';
  const roleColor = role === 'rider' ? '#FF6B6B' : '#4ECDC4';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottomColor: roleColor }}>
          <h2>Upload {roleLabel} Video</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="role-indicator" style={{ backgroundColor: roleColor }}>
            {role === 'rider' ? '🏂' : '👨‍🏫'} {roleLabel} Video
          </div>

          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="file-input"
            />
            <label className="file-label">
              {selectedFile ? selectedFile.name : 'Choose video file...'}
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          {uploading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%`, backgroundColor: roleColor }}
                />
              </div>
              <p className="progress-text">{uploadProgress}% - Processing...</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{ backgroundColor: roleColor }}
          >
            {uploading ? 'Processing...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};
