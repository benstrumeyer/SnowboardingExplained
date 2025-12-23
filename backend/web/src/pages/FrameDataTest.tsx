/**
 * Frame Data Test Page
 * Simple page to test the frame-data API integration
 */

import { useState } from 'react';
import { VideoFrameRenderer } from '../components/VideoFrameRenderer';

export function FrameDataTest() {
  const [videoId, setVideoId] = useState('test-video-1');
  const [frameIndex, setFrameIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Frame Data API Test</h1>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Video ID:
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              style={{ marginLeft: '10px', padding: '4px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Frame Index:
            <input
              type="number"
              value={frameIndex}
              onChange={(e) => setFrameIndex(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ marginLeft: '10px', padding: '4px', width: '100px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
            />
            Show Overlay
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}>← Previous</button>
          <button onClick={() => setFrameIndex(frameIndex + 1)}>Next →</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Frame Preview</h2>
        <VideoFrameRenderer
          videoId={videoId}
          frameIndex={frameIndex}
          width={640}
          height={480}
          showOverlay={showOverlay}
        />
      </div>

      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
        <p>
          <strong>API Endpoint:</strong> GET /api/video/{'{videoId}'}/frame/{'{frameIndex}'}
        </p>
        <p>
          <strong>Query Parameters:</strong>
          <br />
          - includeOriginal: true
          <br />
          - includeOverlay: {showOverlay.toString()}
          <br />
          - includeMesh: false
          <br />
          - compress: true
        </p>
      </div>
    </div>
  );
}
