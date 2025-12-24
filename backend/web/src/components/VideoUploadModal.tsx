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
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

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

  const uploadChunks = async (file: File, sessionId: string): Promise<boolean> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log(`[CHUNKED-UPLOAD] Starting chunked upload: ${totalChunks} chunks`);

    for (let i = 0; i < totalChunks; i++) {
      try {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('sessionId', sessionId);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());

        console.log(`[CHUNKED-UPLOAD] Uploading chunk ${i + 1}/${totalChunks}`);

        await axios.post(`${API_URL}/api/upload-chunk`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60 seconds per chunk
          onUploadProgress: (progressEvent) => {
            const chunkProgress = (progressEvent.loaded / (progressEvent.total || 1)) * 100;
            const overallProgress = ((i + chunkProgress / 100) / totalChunks) * 100;
            setUploadProgress(Math.round(overallProgress));
          },
        });

        console.log(`[CHUNKED-UPLOAD] ✓ Chunk ${i + 1}/${totalChunks} uploaded`);
      } catch (err) {
        console.error(`[CHUNKED-UPLOAD] Error uploading chunk ${i + 1}:`, err);
        setError(`Failed to upload chunk ${i + 1}/${totalChunks}`);
        return false;
      }
    }

    return true;
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
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[UPLOAD] Starting upload with sessionId: ${sessionId}`);
      console.log(`[UPLOAD] File: ${selectedFile.name}, Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);

      // Upload chunks
      const chunksSuccess = await uploadChunks(selectedFile, sessionId);
      if (!chunksSuccess) {
        setUploading(false);
        return;
      }

      setUploadProgress(95);
      console.log('[UPLOAD] All chunks uploaded, finalizing...');

      // Finalize upload (assemble chunks, don't re-upload the file)
      const finalizeResponse = await axios.post(`${API_URL}/api/finalize-upload`, {
        role,
        sessionId,
        filename: selectedFile.name,
        filesize: selectedFile.size
      }, {
        timeout: 300000, // 5 minute timeout for finalization
      });

      setUploadProgress(100);
      console.log('[UPLOAD] ✓ Upload complete:', finalizeResponse.data);

      const { videoId } = finalizeResponse.data;
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
                {uploadProgress < 95 
                  ? `Uploading... ${uploadProgress}%` 
                  : 'Finalizing upload...'}
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
