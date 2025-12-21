import React from 'react';

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#222',
          color: '#fff',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Help</h2>
        <p>Use the controls to navigate and compare poses.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
