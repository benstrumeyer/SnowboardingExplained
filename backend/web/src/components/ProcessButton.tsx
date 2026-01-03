import React, { useState } from 'react';

interface ProcessButtonProps {
  onSuccess?: (videoId: string, frameCount: number) => void;
  onError?: (error: string) => void;
}

export const ProcessButton: React.FC<ProcessButtonProps> = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleProcess = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:3001/api/video/process-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      setMessage({
        type: 'success',
        text: `✓ Video processed successfully! Video ID: ${data.videoId}`,
      });

      if (onSuccess) {
        onSuccess(data.videoId, data.frameCount);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setMessage({
        type: 'error',
        text: `✗ Error: ${errorMessage}`,
      });

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <button
        onClick={handleProcess}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processing...' : 'Process'}
      </button>

      {message && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            borderRadius: '4px',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};
