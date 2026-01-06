import { useState } from 'react';

interface ProcessVideosButtonProps {
  onProcess?: () => Promise<void>;
}

export function ProcessVideosButton({ onProcess }: ProcessVideosButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleClick = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      if (onProcess) {
        await onProcess();
      } else {
        const response = await fetch('http://localhost:3001/api/video/process-directory', {
          method: 'POST',
        });
        const result = await response.json();

        if (result.success) {
          setMessage({
            type: 'success',
            text: `✓ Processed ${result.processedCount} video(s)`,
          });
        } else {
          setMessage({
            type: 'error',
            text: `✗ ${result.error || 'Processing failed'}`,
          });
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: `✗ Error: ${err}`,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleClick}
        disabled={isProcessing}
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          backgroundColor: isProcessing ? '#888' : '#95E1D3',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        {isProcessing ? '⏳ Processing...' : '⚙️ Process Videos'}
      </button>
      {message && (
        <div
          style={{
            fontSize: '12px',
            color: message.type === 'success' ? '#4ECDC4' : '#FF6B6B',
            whiteSpace: 'nowrap',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
