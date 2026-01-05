import { useEffect, useState } from 'react';
import { getGlobalPlaybackEngine } from './engine/PlaybackEngine';
import { useGridStore } from './stores/gridStore';
import { GridLayout } from './components/GridLayout';
import { SharedControls } from './components/SharedControls';
import { PlaybackTester } from './components/PlaybackTester';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { globalCameraManager, CameraPreset } from './services/globalCameraManager';
import './styles/App.css';

function App() {
  const [currentCameraPreset, setCurrentCameraPreset] = useState<CameraPreset>('front');

  useEffect(() => {
    getGlobalPlaybackEngine();
  }, []);

  const gridRows = useGridStore((state) => state.gridRows);
  const gridColumns = useGridStore((state) => state.gridColumns);
  const setGridDimensions = useGridStore((state) => state.setGridDimensions);

  const handleCameraPreset = (preset: CameraPreset) => {
    globalCameraManager.setPreset(preset);
    setCurrentCameraPreset(preset);
  };

  const cameraPresets: CameraPreset[] = ['top', 'front', 'back', 'left', 'right'];

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 style={{ margin: '6px', fontSize: '24px' }}>SnowboardingExplained</h1>
      </div>

      <div className="app-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Process Videos</h3>
            <button
              style={{
                padding: '8px 12px',
                width: '100%',
                fontSize: '12px',
                backgroundColor: '#95E1D3',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
              onClick={async () => {
                try {
                  const response = await fetch('http://localhost:3001/api/video/process-directory', {
                    method: 'POST',
                  });
                  const result = await response.json();
                  if (result.success) {
                    alert(`✓ Processed ${result.processedCount} video(s)`);
                  } else {
                    alert(`✗ ${result.error || 'Processing failed'}`);
                  }
                } catch (err) {
                  alert(`✗ Error: ${err}`);
                }
              }}
            >
              ⚙️ Process Videos
            </button>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Grid Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <label style={{ color: '#999', fontSize: '12px', minWidth: '50px' }}>Rows:</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={gridRows}
                  onChange={(e) => setGridDimensions(parseInt(e.target.value), gridColumns)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <label style={{ color: '#999', fontSize: '12px', minWidth: '50px' }}>Cols:</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={gridColumns}
                  onChange={(e) => setGridDimensions(gridRows, parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {gridRows}x{gridColumns} = {gridRows * gridColumns} cells
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Camera Controls</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cameraPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleCameraPreset(preset)}
                  style={{
                    padding: '8px 12px',
                    width: '100%',
                    fontSize: '12px',
                    backgroundColor: currentCameraPreset === preset ? '#4ECDC4' : '#333',
                    color: currentCameraPreset === preset ? '#000' : '#fff',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: currentCameraPreset === preset ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (currentCameraPreset !== preset) {
                      e.currentTarget.style.backgroundColor = '#444';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentCameraPreset !== preset) {
                      e.currentTarget.style.backgroundColor = '#333';
                    }
                  }}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
              <button
                onClick={() => handleCameraPreset('front')}
                style={{
                  padding: '8px 12px',
                  width: '100%',
                  fontSize: '12px',
                  backgroundColor: '#555',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Reset Camera
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Shared Controls</h3>
            <SharedControls />
          </div>
        </div>

        <div className="viewer-container">
          <GridLayout />
        </div>
      </div>

      <PlaybackTester />
      <PerformanceMonitor />
    </div>
  );
}

export default App;
