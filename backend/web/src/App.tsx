import { useState } from 'react';
import { PoseOverlayViewer } from './components/PoseOverlayViewer';
import { VideoUploadModal } from './components/VideoUploadModal';
import './styles/App.css';

function App() {
  const [riderVideoId, setRiderVideoId] = useState('rider-video-1');
  const [referenceVideoId, setReferenceVideoId] = useState('coach-video-1');
  const [phase, setPhase] = useState('takeoff');
  const [uploadModalOpen, setUploadModalOpen] = useState<'rider' | 'reference' | null>(null);

  const handleVideoLoaded = (videoId: string, role: 'rider' | 'coach') => {
    if (role === 'rider') {
      setRiderVideoId(videoId);
    } else {
      setReferenceVideoId(videoId);
    }
    setUploadModalOpen(null);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Pose Overlay Viewer</h1>
        <div className="header-controls">
          <button
            className="upload-btn rider-btn"
            onClick={() => setUploadModalOpen('rider')}
            title="Upload rider video"
          >
            🏂 Upload Rider
          </button>
          <button
            className="upload-btn reference-btn"
            onClick={() => setUploadModalOpen('reference')}
            title="Upload reference/coach video"
          >
            👨‍🏫 Upload Reference
          </button>
        </div>
      </div>

      <PoseOverlayViewer
        riderVideoId={riderVideoId}
        referenceVideoId={referenceVideoId}
        phase={phase}
      />

      {uploadModalOpen && (
        <VideoUploadModal
          isOpen={true}
          role={uploadModalOpen}
          onClose={() => setUploadModalOpen(null)}
          onVideoLoaded={handleVideoLoaded}
        />
      )}
    </div>
  );
}

export default App;
