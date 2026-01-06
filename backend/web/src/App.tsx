import { useEffect, useState } from 'react';
import { getGlobalPlaybackEngine } from './engine/PlaybackEngine';
import { useGridStore } from './stores/gridStore';
import { GridLayout } from './components/GridLayout';
import { GlobalScrubberOverlay } from './components/GlobalScrubberOverlay';
import { GridConfigurationModal } from './components/GridConfigurationModal';
import { ProcessVideosButton } from './components/ProcessVideosButton';
import { PlaybackTester } from './components/PlaybackTester';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import './styles/App.css';

function App() {
  const [showGridConfig, setShowGridConfig] = useState(false);
  const gridRows = useGridStore((state) => state.gridRows);
  const gridColumns = useGridStore((state) => state.gridColumns);
  const setGridDimensions = useGridStore((state) => state.setGridDimensions);

  useEffect(() => {
    getGlobalPlaybackEngine();
  }, []);

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>SnowboardingExplained</h1>
        <div className="header-controls">
          <button
            onClick={() => setShowGridConfig(true)}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            ⚙️ Grid ({gridRows}x{gridColumns})
          </button>
          <ProcessVideosButton />
        </div>
      </div>

      <div className="app-content">
        <div className="viewer-container">
          <GridLayout />
          <GlobalScrubberOverlay />
        </div>
      </div>

      <GridConfigurationModal
        isOpen={showGridConfig}
        rows={gridRows}
        columns={gridColumns}
        onConfirm={(rows, cols) => {
          setGridDimensions(rows, cols);
          setShowGridConfig(false);
        }}
        onCancel={() => setShowGridConfig(false)}
      />

      <PlaybackTester />
      <PerformanceMonitor />
    </div>
  );
}

export default App;
