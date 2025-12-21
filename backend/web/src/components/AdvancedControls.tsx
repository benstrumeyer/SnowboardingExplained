import React from 'react';

interface AdvancedControlsProps {
  inPlaceMode: boolean;
  scaleToRider: boolean;
  scaleFactor: number;
  showProportionWarning: boolean;
  onInPlaceModeChange: (enabled: boolean) => void;
  onScaleToRiderChange: (enabled: boolean) => void;
}

export function AdvancedControls({
  inPlaceMode,
  scaleToRider,
  scaleFactor,
  showProportionWarning,
  onInPlaceModeChange,
  onScaleToRiderChange,
}: AdvancedControlsProps) {
  return (
    <div className="control-group">
      <h3 className="text-lg font-bold text-white mb-3">Advanced Options</h3>

      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors">
        <input
          type="checkbox"
          checked={inPlaceMode}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onInPlaceModeChange(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-300">In-Place Motion Mode</span>
      </label>

      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors">
        <input
          type="checkbox"
          checked={scaleToRider}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onScaleToRiderChange(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-300">Scale to Rider</span>
      </label>

      {scaleToRider && (
        <div className="mt-2 p-2 bg-gray-700 rounded text-sm text-gray-300">
          Scale Factor: <span className="font-mono text-primary">{scaleFactor.toFixed(2)}x</span>
        </div>
      )}

      {showProportionWarning && (
        <div className="mt-2 p-2 bg-orange-900/30 border border-orange-600 rounded text-sm text-orange-300">
          ⚠ Body proportion mismatch &gt; 15%
        </div>
      )}
    </div>
  );
}
