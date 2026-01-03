import { useState } from 'react';
import { PoseOverlayViewer } from './components/PoseOverlayViewer';
import { VideoUploadModal } from './components/VideoUploadModal';
import { ModelsCardList } from './components/ModelsCardList';
import { ViewMode } from './components/ViewMode';
import { PlaybackControls } from './components/PlaybackControls';
import { SyncScenesButton } from './components/SyncScenesButton';
import { ProcessButton } from './components/ProcessButton';
import { FrameDataTest } from './pages/FrameDataTest';
import './styles/App.css';

function App() {
  const [riderVideoId, setRiderVideoId] = useState('');
  const [referenceVideoId, setReferenceVideoId] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState<'rider' | 'reference' | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'comparison' | 'single-scene'>('side-by-side');
  const [showFrameDataTest, setShowFrameDataTest] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Independent scene frames
  const [leftSceneFrame, setLeftSceneFrame] = useState(0);
  const [rightSceneFrame, setRightSceneFrame] = useState(0);

  // Shared camera preset
  const [sharedCameraPreset, setSharedCameraPreset] = useState<'top' | 'front' | 'back' | 'left' | 'right'>('front');

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

  const handleSyncScenes = () => {
    // Reset both scenes to frame 1 and front camera view
    setLeftSceneFrame(0);
    setRightSceneFrame(0);
    setSharedCameraPreset('front');
    setIsPlaying(false);
  };

  return (
    <div className="app-container">
      {showFrameDataTest ? (
        <div>
          <button
            onClick={() => setShowFrameDataTest(false)}
            style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              zIndex: 1000,
              padding: '8px 16px',
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back to Main
          </button>
          <FrameDataTest />
        </div>
      ) : (
        <>
          <div className="app-header">
            <h1 style={{ margin: '6px', fontSize: '24px' }}>SnowboardingExplained</h1>
          </div>

          <div className="app-content">
            <div className="sidebar">
              <div className="sidebar-section">
                <h3 className="sidebar-title">Upload Videos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="upload-btn rider-btn"
                    onClick={() => setUploadModalOpen('rider')}
                    title="Upload rider video"
                    style={{
                      padding: '8px 12px',
                      width: '100%',
                      fontSize: '12px'
                    }}
                  >
                    🏂 Upload Rider
                  </button>
                  <button
                    className="upload-btn reference-btn"
                    onClick={() => setUploadModalOpen('reference')}
                    title="Upload reference/coach video"
                    style={{
                      padding: '8px 12px',
                      width: '100%',
                      fontSize: '12px'
                    }}
                  >
                    👨‍🏫 Upload Reference
                  </button>
                  <ProcessButton
                    onSuccess={(videoId, frameCount) => {
                      console.log(`Video processed: ${videoId} with ${frameCount} frames`);
                      setRiderVideoId(videoId);
                    }}
                    onError={(error) => {
                      console.error(`Processing error: ${error}`);
                    }}
                  />
                  <button
                    onClick={() => setShowFrameDataTest(true)}
                    style={{
                      padding: '8px 12px',
                      width: '100%',
                      backgroundColor: '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🧪 Test Frame API
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Shared Camera Controls</h3>

                {/* View Mode */}
                <div>
                  <h4 className="sidebar-subtitle">View Mode</h4>
                  <ViewMode currentMode={viewMode} onModeChange={setViewMode} />
                </div>

                {/* Shared Camera Presets */}
                <div>
                  <h4 className="sidebar-subtitle">Camera Presets</h4>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(['top', 'front', 'back', 'left', 'right'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setSharedCameraPreset(preset)}
                        style={{
                          flex: '1 1 calc(50% - 2px)',
                          padding: '6px 8px',
                          background: sharedCameraPreset === preset ? '#4ECDC4' : '#333',
                          color: sharedCameraPreset === preset ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: sharedCameraPreset === preset ? '600' : '500',
                          textTransform: 'capitalize',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <SyncScenesButton onSync={handleSyncScenes} />
                  </div>
                </div>

                {/* Global Playback Controls */}
                <div>
                  <h4 className="sidebar-subtitle">Playback</h4>
                  <PlaybackControls
                    isPlaying={isPlaying}
                    currentFrame={currentFrame}
                    totalFrames={totalFrames}
                    speed={playbackSpeed}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    onScrub={setCurrentFrame}
                    onSpeedChange={setPlaybackSpeed}
                  />
                </div>
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-title">Models</h3>
                <ModelsCardList onModelSelect={handleModelSelect} maxCards={6} />
              </div>
            </div>

            <div className="viewer-container">
              <PoseOverlayViewer
                riderVideoId={riderVideoId}
                referenceVideoId={referenceVideoId}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                isPlaying={isPlaying}
                onPlayingChange={setIsPlaying}
                currentFrame={currentFrame}
                onFrameChange={setCurrentFrame}
                totalFrames={totalFrames}
                onTotalFramesChange={setTotalFrames}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
                sharedCameraPreset={sharedCameraPreset}
                onRiderVideoChange={setRiderVideoId}
                onReferenceVideoChange={setReferenceVideoId}
                leftSceneFrame={leftSceneFrame}
                onLeftSceneFrameChange={setLeftSceneFrame}
                rightSceneFrame={rightSceneFrame}
                onRightSceneFrameChange={setRightSceneFrame}
                onSyncScenes={handleSyncScenes}
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
        </>
      )}
    </div>
  );
}

export default App;
