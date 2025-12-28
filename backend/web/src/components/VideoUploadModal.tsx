import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/VideoUploadModal.css';

// Hash file to generate deterministic videoId
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // Use first 16 chars for shorter ID
}

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
    setUploadProgress(0);

    try {
      console.log(`[UPLOAD] Starting direct upload to /api/pose/video`);
      console.log(`[UPLOAD] File: ${selectedFile.name}, Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);

      // Generate deterministic videoId from file hash
      const videoId = await hashFile(selectedFile);
      console.log(`[UPLOAD] Generated videoId from file hash: ${videoId}`);

      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('videoId', videoId);

      const uploadResponse = await axios.post(`${API_URL}/api/pose/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 minute timeout for video processing
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / (progressEvent.total || 1)) * 100);
          setUploadProgress(progress);
        },
      });

      setUploadProgress(100);
      console.log('[UPLOAD] ✓ Upload and processing complete:', uploadResponse.data);

      // Use the videoId we sent to the backend
      console.log('[UPLOAD] Using videoId:', videoId);
      resetForm();
      onClose();
      onVideoLoaded(videoId, role === 'rider' ? 'rider' : 'coach');

    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMsg);
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
  const fileSizeMB = selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0';

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
              {selectedFile ? `${selectedFile.name} (${fileSizeMB}MB)` : 'Choose video file...'}
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
              <p className="progress-text">
                {uploadProgress < 100 
                  ? `Uploading and processing... ${uploadProgress}%` 
                  : 'Processing complete!'}
              </p>
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
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};
