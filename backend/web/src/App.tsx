import { useEffect } from 'react';
import { getGlobalPlaybackEngine } from './engine/PlaybackEngine';
import { useGridStore } from './stores/gridStore';
import { GridLayout } from './components/GridLayout';
import { SharedControls } from './components/SharedControls';
import { PlaybackTester } from './components/PlaybackTester';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import './styles/App.css';

function App() {
  useEffect(() => {
    getGlobalPlaybackEngine();
  }, []);

  const gridRows = useGridStore((state) => state.gridRows);
  const gridColumns = useGridStore((state) => state.gridColumns);
  const setGridDimensions = useGridStore((state) => state.setGridDimensions);

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 style={{ margin: '6px', fontSize: '24px' }}>SnowboardingExplained</h1>
      </div>

      <div className="app-content">
        <div className="sidebar">
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
