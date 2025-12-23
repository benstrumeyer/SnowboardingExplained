interface MeshControlsProps {
  meshName: string;
  isVisible: boolean;
  color?: string;
  opacity?: number;
  onVisibilityChange: (visible: boolean) => void;
  onColorChange?: (color: string) => void;
  onOpacityChange?: (opacity: number) => void;
}

export function MeshControls({
  meshName,
  isVisible,
  color = '#FF6B6B',
  opacity = 1,
  onVisibilityChange,
  onColorChange,
  onOpacityChange,
}: MeshControlsProps) {
  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <h3>{meshName}</h3>
      <label>
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e) => onVisibilityChange(e.target.checked)}
        />
        Visible
      </label>
      <div>
        <label>Color:</label>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange?.(e.target.value)}
          style={{ width: '100%', height: '30px', cursor: 'pointer' }}
        />
      </div>
      <div>
        <label>Opacity: {(opacity * 100).toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
