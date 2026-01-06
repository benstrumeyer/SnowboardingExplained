import { useEffect, useState } from 'react';
import { getGlobalPlaybackEngine } from './engine/PlaybackEngine';
import { useGridStore } from './stores/gridStore';
import { GridLayout } from './components/GridLayout';
import { GlobalScrubberOverlay } from './components/GlobalScrubberOverlay';
import { ProcessVideosButton } from './components/ProcessVideosButton';
import { NavBarStatus } from './components/NavBarStatus';
import './styles/App.css';

function App() {
  const gridRows = useGridStore((state) => state.gridRows);
  const gridColumns = useGridStore((state) => state.gridColumns);
  const setGridDimensions = useGridStore((state) => state.setGridDimensions);
  const isContentLoaded = useGridStore((state) => state.isContentLoaded);

  useEffect(() => {
    getGlobalPlaybackEngine();
  }, []);

  const handleRowsChange = (delta: number) => {
    const newRows = Math.max(1, Math.min(4, gridRows + delta));
    setGridDimensions(newRows, gridColumns);
  };

  const handleColumnsChange = (delta: number) => {
    const newColumns = Math.max(1, Math.min(4, gridColumns + delta));
    setGridDimensions(gridRows, newColumns);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>SnowboardingExplained</h1>
        <NavBarStatus />
        <div className="header-controls">
          <div className="grid-config-inline">
            <div className="grid-config-item">
              <label>Rows</label>
              <button
                onClick={() => handleRowsChange(-1)}
                className="grid-btn"
                disabled={gridRows <= 1}
              >
                −
              </button>
              <span className="grid-value">{gridRows}</span>
              <button
                onClick={() => handleRowsChange(1)}
                className="grid-btn"
                disabled={gridRows >= 4}
              >
                +
              </button>
            </div>
            <div className="grid-config-item">
              <label>Cols</label>
              <button
                onClick={() => handleColumnsChange(-1)}
                className="grid-btn"
                disabled={gridColumns <= 1}
              >
                −
              </button>
              <span className="grid-value">{gridColumns}</span>
              <button
                onClick={() => handleColumnsChange(1)}
                className="grid-btn"
                disabled={gridColumns >= 4}
              >
                +
              </button>
            </div>
          </div>
          <ProcessVideosButton />
        </div>
      </div>

      <div className="app-content">
        <div className="viewer-container">
          <div className="grid-wrapper">
            <GridLayout />
          </div>
          <div className={`scrubber-wrapper ${!isContentLoaded ? 'hidden' : ''}`}>
            <GlobalScrubberOverlay />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
