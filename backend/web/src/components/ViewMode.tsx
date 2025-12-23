export type ViewModeType = 'side-by-side' | 'overlay' | 'comparison' | 'single-scene';

interface ViewModeProps {
  currentMode: ViewModeType;
  onModeChange: (mode: ViewModeType) => void;
}

/**
 * ViewMode Component
 * Allows switching between different display modes
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function ViewMode({ currentMode, onModeChange }: ViewModeProps) {
  const modes: { value: ViewModeType; label: string; icon: string }[] = [
    { value: 'side-by-side', label: 'Side-by-Side', icon: '⊡⊡' },
    { value: 'overlay', label: 'Overlay', icon: '⊕' },
    { value: 'comparison', label: 'Comparison', icon: '⇄' },
    { value: 'single-scene', label: 'Single Scene', icon: '⊙' },
  ];

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onModeChange(mode.value)}
          style={{
            flex: '1 1 calc(50% - 3px)',
            padding: '8px 10px',
            background: currentMode === mode.value ? '#4ECDC4' : '#333',
            color: currentMode === mode.value ? '#000' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: currentMode === mode.value ? '600' : '500',
            transition: 'all 0.2s',
          }}
          title={mode.label}
        >
          {mode.icon} {mode.label}
        </button>
      ))}
    </div>
  );
}
