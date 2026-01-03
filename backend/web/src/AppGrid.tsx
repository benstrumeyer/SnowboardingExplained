import { useState } from 'react';
import { GridLayout, CellState, SharedControlState } from './components/GridLayout';
import { GridConfigControls } from './components/GridConfigControls';
import { VideoUploadModal } from './components/VideoUploadModal';
import { ModelsCardList } from './components/ModelsCardList';
import './styles/App.css';

function AppGrid() {
  const [gridRows, setGridRows] = useState(1);
  const [gridColumns, setGridColumns] = useState(2);
  const [cells, setCells] = useState<CellState[]>(
    Array.from({ length: 16 }, (_, i) => ({
      id: `cell-${i}`,
      contentType: 'empty' as const,
      playbackState: {
        currentFrame: 0,
        isPlaying: false,
        playbackSpeed: 1,
        totalFrames: 0,
        videoMode: 'original' as const,
      },
      isSynced: false,
      windowedControlsPosition: { x: 10, y: 10 },
      isWindowedControlsCollapsed: false,
      nametag: '',
    }))
  );

  const [sharedControls, setSharedControls] = useState<SharedControlState>({
    currentFrame: 0,
    playbackSpeed: 1,
    cameraPreset: 'back',
    isPlaying: false,
  });

  const [uploadModalOpen, setUploadModalOpen] = useState<'rider' | 'reference' | null>(null);
  const [showFrameDataTest, setShowFrameDataTest] = useState(false);

  const handleCellUpdate = (cellId: string, newState: CellState) => {
    setCells((prevCells) =>
      prevCells.map((cell) => (cell.id === cellId ? newState : cell))
    );
  };

  const handleGridResize = (rows: number, columns: number) => {
    setGridRows(rows);
    setGridColumns(columns);
  };

  const handleSharedControlsChange = (newControls: SharedControlState) => {
    setSharedControls(newControls);
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
                        setSharedControls({ ...sharedControls, cameraPreset: preset })
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
                  checked={sharedControls.isPlaying}
                  onChange={(e) =>
                    setSharedControls({
                      ...sharedControls,
                      isPlaying: e.target.checked,
                    })
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
                  value={sharedControls.playbackSpeed}
                  onChange={(e) =>
                    setSharedControls({
                      ...sharedControls,
                      playbackSpeed: parseFloat(e.target.value),
                    })
                  }
                  style={{ width: '100%', marginTop: '4px' }}
                />
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                  {sharedControls.playbackSpeed.toFixed(1)}x
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Models</h3>
            <ModelsCardList onModelSelect={() => { }} maxCards={6} />
          </div>
        </div>

        <div className="viewer-container">
          <GridLayout
            rows={gridRows}
            columns={gridColumns}
            cells={cells}
            onCellUpdate={handleCellUpdate}
            sharedControls={sharedControls}
            onSharedControlsChange={handleSharedControlsChange}
          />
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
