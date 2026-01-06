import { useEffect, useRef } from 'react';
import { globalCameraManager, CameraPreset } from '../services/globalCameraManager';

interface CellOverlayControlsProps {
  cellId: string;
  onCameraPresetChange?: (preset: CameraPreset) => void;
}

export function CellOverlayControls({ cellId, onCameraPresetChange }: CellOverlayControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPresetRef = useRef<CameraPreset>('front');

  useEffect(() => {
    if (!containerRef.current) return;

    const presets: CameraPreset[] = ['top', 'front', 'back', 'left', 'right'];
    const buttonRefs: Map<CameraPreset, HTMLButtonElement> = new Map();

    // Create container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '8px';
    container.style.left = '8px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    container.style.zIndex = '10';
    container.style.backgroundColor = 'rgba(26, 26, 26, 0.6)';
    container.style.padding = '6px';
    container.style.borderRadius = '4px';
    container.style.border = '1px solid rgba(68, 68, 68, 0.6)';

    presets.forEach((preset) => {
      const btn = document.createElement('button');
      btn.textContent = preset.charAt(0).toUpperCase() + preset.slice(1);
      btn.style.padding = '6px 10px';
      btn.style.fontSize = '11px';
      btn.style.backgroundColor = preset === 'front' ? '#4ECDC4' : '#333';
      btn.style.color = preset === 'front' ? '#000' : '#fff';
      btn.style.border = '1px solid #444';
      btn.style.borderRadius = '3px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = preset === 'front' ? '600' : '400';
      btn.style.transition = 'all 0.2s';
      btn.style.minWidth = '50px';

      btn.onmouseenter = () => {
        if (preset !== currentPresetRef.current) {
          btn.style.backgroundColor = '#444';
        }
      };

      btn.onmouseleave = () => {
        if (preset !== currentPresetRef.current) {
          btn.style.backgroundColor = '#333';
        }
      };

      btn.onclick = () => {
        // Update all buttons
        presets.forEach((p) => {
          const prevBtn = buttonRefs.get(p);
          if (prevBtn) {
            prevBtn.style.backgroundColor = p === preset ? '#4ECDC4' : '#333';
            prevBtn.style.color = p === preset ? '#000' : '#fff';
            prevBtn.style.fontWeight = p === preset ? '600' : '400';
          }
        });

        currentPresetRef.current = preset;
        globalCameraManager.setPreset(preset);
        onCameraPresetChange?.(preset);
      };

      buttonRefs.set(preset, btn);
      container.appendChild(btn);
    });

    containerRef.current.appendChild(container);

    return () => {
      if (containerRef.current && container.parentNode === containerRef.current) {
        containerRef.current.removeChild(container);
      }
    };
  }, [cellId, onCameraPresetChange]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
