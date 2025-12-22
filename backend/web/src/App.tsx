import { useState } from 'react';
import { PoseOverlayViewer } from './components/PoseOverlayViewer';
import { VideoUploadModal } from './components/VideoUploadModal';
import { ModelsBrowser } from './components/ModelsBrowser';
import './styles/App.css';

function App() {
  const [riderVideoId, setRiderVideoId] = useState('rider-video-1');
  const [referenceVideoId, setReferenceVideoId] = useState('coach-video-1');
  const [phase, setPhase] = useState('takeoff');
  const [uploadModalOpen, setUploadModalOpen] = useState<'rider' | 'reference' | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'models' | 'settings'>('models');

  const handleVideoLoaded = (videoId: string, role: 'rider' | 'coach') => {
    if (role === 'rider') {
      setRiderVideoId(videoId);
    } else {
      setReferenceVideoId(videoId);
    }
    setUploadModalOpen(null);
  };

  const handleModelSelect = (videoId: string, role: 'rider' | 'coach') => {
    if (role === 'rider') {
      setRiderVideoId(videoId);
    } else {
      setReferenceVideoId(videoId);
    }
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

      <div className="app-content">
        <div className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${sidebarTab === 'models' ? 'active' : ''}`}
              onClick={() => setSidebarTab('models')}
              title="Browse loaded models"
            >
              📦 Models
            </button>
            <button
              className={`tab-btn ${sidebarTab === 'settings' ? 'active' : ''}`}
              onClick={() => setSidebarTab('settings')}
              title="Settings"
            >
              ⚙️ Settings
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'models' && (
              <ModelsBrowser onModelSelect={handleModelSelect} />
            )}
            {sidebarTab === 'settings' && (
              <div className="settings-panel">
                <h3>Settings</h3>
                <p>Settings coming soon...</p>
              </div>
            )}
          </div>
        </div>

        <div className="viewer-container">
          <PoseOverlayViewer
            riderVideoId={riderVideoId}
            referenceVideoId={referenceVideoId}
            phase={phase}
          />
        </div>
      </div>

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
