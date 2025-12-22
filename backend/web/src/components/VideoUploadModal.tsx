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

      // Upload video - fire and forget
      axios.post(`${API_URL}/api/upload-video-with-pose`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minute timeout
        onUploadProgress: (progressEvent) => {
          const progress = 10 + Math.round((progressEvent.loaded / (progressEvent.total || 1)) * 40);
          setUploadProgress(progress);
        },
      }).then((uploadResponse) => {
        console.log('[UPLOAD] Upload response:', uploadResponse.data);
        const { videoId } = uploadResponse.data;
        console.log(`[UPLOAD] ✓ Video sent for processing: ${videoId}`);
      }).catch((err) => {
        console.error('[UPLOAD] Background error:', err);
      });

      // Close dialog immediately
      setUploadProgress(100);
      console.log('[UPLOAD] Dialog closing - processing continues in background');
      resetForm();
      onClose();

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
              <p className="progress-text">Uploading... Processing will continue in background</p>
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
