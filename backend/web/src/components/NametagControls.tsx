import React, { useState } from 'react';
import '../styles/NametagControls.css';

interface NametagControlsProps {
  onNametagChange: (text: string) => void;
  onColorChange?: (color: string) => void;
}

export const NametagControls: React.FC<NametagControlsProps> = ({
  onNametagChange,
  onColorChange,
}) => {
  const [nametagText, setNametagText] = useState('');
  const [nametagColor, setNametagColor] = useState('#4ECDC4');

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNametagText(text);
    onNametagChange(text);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setNametagColor(color);
    onColorChange?.(color);
  };

  const handleClear = () => {
    setNametagText('');
    onNametagChange('');
  };

  return (
    <div className="nametag-controls">
      <div className="nametag-input-group">
        <label className="nametag-label">Nametag Text</label>
        <input
          type="text"
          className="nametag-input"
          value={nametagText}
          onChange={handleTextChange}
          placeholder="Enter nametag text..."
          maxLength={30}
        />
        {nametagText && (
          <button className="nametag-clear-btn" onClick={handleClear} title="Clear nametag">
            ✕
          </button>
        )}
      </div>

      <div className="nametag-color-group">
        <label className="nametag-label">Color</label>
        <div className="nametag-color-picker">
          <input
            type="color"
            className="nametag-color-input"
            value={nametagColor}
            onChange={handleColorChange}
          />
          <span className="nametag-color-value">{nametagColor}</span>
        </div>
      </div>

      <div className="nametag-preview">
        <span className="nametag-preview-label">Preview:</span>
        <span
          className="nametag-preview-text"
          style={{ color: nametagColor }}
        >
          {nametagText || 'Your text here'}
        </span>
      </div>
    </div>
  );
};
