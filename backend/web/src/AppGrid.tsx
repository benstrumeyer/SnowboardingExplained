import { useGridStore } from './stores/gridStore';
import { GridLayout } from './components/GridLayout';
import { GridConfigControls } from './components/GridConfigControls';
import { VideoUploadModal } from './components/VideoUploadModal';
import { ModelsCardList } from './components/ModelsCardList';
import { useState } from 'react';
import './styles/App.css';

function AppGrid() {
  const gridRows = useGridStore((state) => state.gridRows);
  const gridColumns = useGridStore((state) => state.gridColumns);
  const sharedControls = useGridStore((state) => state.sharedControls);
  const setGridDimensions = useGridStore((state) => state.setGridDimensions);
  const setSharedCameraPreset = useGridStore((state) => state.setSharedCameraPreset);
  const play = useGridStore((state) => state.play);
  const pause = useGridStore((state) => state.pause);
  const setSpeed = useGridStore((state) => state.setSpeed);

  const [uploadModalOpen, setUploadModalOpen] = useState<'rider' | 'reference' | null>(null);

  const handleGridResize = (rows: number, columns: number) => {
    setGridDimensions(rows, columns);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 style={{ margin: '6px', fontSize: '24px' }}>SnowboardingExplained</h1>
      </div>

      <div className="app-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Upload Videos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: '12px',
                  backgroundColor: '#FF6B6B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setUploadModalOpen('rider')}
              >
                🏂 Upload Rider
              </button>
              <button
                style={{
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: '12px',
                  backgroundColor: '#4ECDC4',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setUploadModalOpen('reference')}
              >
                👨‍🏫 Upload Reference
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Grid Configuration</h3>
            <GridConfigControls
              rows={gridRows}
              columns={gridColumns}
              onGridChange={handleGridResize}
            />
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Shared Controls</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ color: '#999', fontSize: '11px' }}>Camera Preset</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {(['top', 'front', 'back', 'left', 'right'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() =>
                        setSharedCameraPreset(preset)
                      }
                      style={{
                        flex: '1 1 calc(50% - 2px)',
                        padding: '6px 8px',
                        background:
                          sharedControls.cameraPreset === preset ? '#4ECDC4' : '#333',
                        color: sharedControls.cameraPreset === preset ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight:
                          sharedControls.cameraPreset === preset ? '600' : '500',
                        textTransform: 'capitalize',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#999',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                <input
                  type="checkbox"
                  onChange={(e) =>
                    e.target.checked ? play() : pause()
                  }
                  style={{ cursor: 'pointer' }}
                />
                Play All Synced
              </label>

              <div style={{ marginTop: '8px' }}>
                <label style={{ color: '#999', fontSize: '11px' }}>Speed</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  onChange={(e) =>
                    setSpeed(parseFloat(e.target.value))
                  }
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Models</h3>
            <ModelsCardList onModelSelect={() => { }} maxCards={6} />
          </div>
        </div>

        <div className="viewer-container">
          <GridLayout />
        </div>
      </div>

      {uploadModalOpen && (
        <VideoUploadModal
          isOpen={true}
          role={uploadModalOpen}
          onClose={() => setUploadModalOpen(null)}
          onVideoLoaded={() => setUploadModalOpen(null)}
        />
      )}
    </div>
  );
}

export default AppGrid;
