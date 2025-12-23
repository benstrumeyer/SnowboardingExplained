import React from 'react';
import '../styles/SyncScenesButton.css';

interface SyncScenesButtonProps {
  onSync: () => void;
  disabled?: boolean;
}

/**
 * Button to synchronize all scenes to frame 1 with default camera orientation
 */
export const SyncScenesButton: React.FC<SyncScenesButtonProps> = ({ onSync, disabled = false }) => {
  return (
    <button
      className="sync-scenes-btn"
      onClick={onSync}
      disabled={disabled}
      title="Sync all scenes to frame 1 with default camera orientation"
    >
      🔄 Sync Scenes
    </button>
  );
};
