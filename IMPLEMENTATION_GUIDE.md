# Implementation Guide: Draggable Floating Panels

## Quick Summary
We've created the infrastructure for draggable floating panels with shared controls. Now we need to update `PoseOverlayViewer.tsx` to use the new `FloatingControlPanel` component.

## What We've Created

### 1. `useDraggable.ts` Hook
Provides dragging functionality for any element:
```typescript
const { position, elementRef, handlers } = useDraggable(initialX, initialY);
```

### 2. `FloatingControlPanel.tsx` Component
A reusable floating panel that includes:
- Draggable header
- Model selector (ModelsCardList)
- Scene-specific playback controls
- Speed controls

### 3. `FloatingControlPanel.css`
Styling for the floating panels

## How to Update PoseOverlayViewer

### Pattern: Replace Inline Floating Panel with FloatingControlPanel

**BEFORE (Current Code):**
```jsx
{/* Floating Control Panel */}
<div style={{
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'rgba(0, 0, 0, 0.85)',
  border: '1px solid #444',
  borderRadius: '8px',
  padding: '12px',
  maxWidth: '200px',
  maxHeight: '80vh',
  overflowY: 'auto',
  color: '#fff',
  fontSize: '12px',
  zIndex: 10,
}}>
  {/* Model Selector */}
  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #555' }}>
    <label style={{ display: 'block', marginBottom: '6px', fontSize: '10px', fontWeight: '600' }}>Load Model</label>
    <ModelsCardList onModelSelect={(videoId, role) => {
      if (role === 'rider' || role === 'coach') {
        onRiderVideoChange?.(videoId);
      }
    }} maxCards={3} />
  </div>

  {/* Visibility Toggle */}
  <div style={{ marginBottom: '10px' }}>
    <button
      onClick={() => setLeftScreen(prev => ({ ...prev, isVisible: !prev.isVisible }))}
      style={{...}}
    >
      {leftScreen.isVisible ? '👁️ Visible' : '🚫 Hidden'}
    </button>
  </div>

  {/* Color, Opacity, Camera, Tracking Lines... */}
  {/* ... rest of controls ... */}
</div>
```

**AFTER (New Code):**
```jsx
<FloatingControlPanel
  onModelSelect={(videoId, role) => {
    if (role === 'rider' || role === 'coach') {
      onRiderVideoChange?.(videoId);
    }
  }}
  currentFrame={currentFrame}
  totalFrames={totalFrames}
  isPlaying={isPlaying}
  onPlayPause={() => onPlayingChange(!isPlaying)}
  onFrameChange={onFrameChange}
  playbackSpeed={playbackSpeed}
  onSpeedChange={onSpeedChange}
>
  {/* Scene-specific controls (color, opacity, visibility, camera, tracking) */}
  <div className="floating-section">
    <label className="floating-label">Scene Controls</label>
    
    {/* Visibility Toggle */}
    <button
      onClick={() => setLeftScreen(prev => ({ ...prev, isVisible: !prev.isVisible }))}
      style={{...}}
    >
      {leftScreen.isVisible ? '👁️ Visible' : '🚫 Hidden'}
    </button>

    {/* Color */}
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '10px', fontWeight: '600' }}>Color</label>
      <input
        type="color"
        value={leftScreen.color}
        onChange={(e) => setLeftScreen(prev => ({ ...prev, color: e.target.value }))}
        style={{ width: '100%', height: '28px', cursor: 'pointer', borderRadius: '4px', border: 'none' }}
      />
    </div>

    {/* Opacity */}
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '10px', fontWeight: '600' }}>
        Opacity: {(leftScreen.opacity * 100).toFixed(0)}%
      </label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={leftScreen.opacity}
        onChange={(e) => setLeftScreen(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
        style={{ width: '100%' }}
      />
    </div>

    {/* Camera Presets - NOTE: These should use sharedCameraPreset from props */}
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '10px', fontWeight: '600' }}>Camera (Shared)</label>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {(['top', 'front', 'back', 'left', 'right'] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => leftScreen.cameraService?.setPreset(preset)}
            style={{...}}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>

    {/* Tracking Lines */}
    <div>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
        <input
          type="checkbox"
          checked={leftScreen.showTrackingLines}
          onChange={(e) => setLeftScreen(prev => ({ ...prev, showTrackingLines: e.target.checked }))}
          style={{ marginRight: '6px' }}
        />
        <span style={{ fontSize: '10px' }}>Tracking Lines</span>
      </label>
      {leftScreen.showTrackingLines && (
        <TrackingVisualization
          onTrackingToggle={(index, enabled) => {
            const newSet = new Set(leftScreen.enabledKeypoints);
            if (enabled) newSet.add(index);
            else newSet.delete(index);
            setLeftScreen(prev => ({ ...prev, enabledKeypoints: newSet }));
          }}
        />
      )}
    </div>
  </div>
</FloatingControlPanel>
```

## Key Changes

1. **Dragging**: Automatically handled by FloatingControlPanel
2. **Playback Controls**: Now in the floating panel (scene-specific)
3. **Shared Controls**: Camera presets and playback use shared state from App.tsx
4. **Scene-Specific Controls**: Color, opacity, visibility, tracking remain in children

## Where to Make Changes

In `PoseOverlayViewer.tsx`, find and replace these 6 floating panels:

1. **Line ~263** - Side-by-side view, left screen
2. **Line ~416** - Overlay view, left screen  
3. **Line ~482** - Comparison view, left screen
4. **Line ~585** - Single-scene view, left screen
5. **Line ~758** - Side-by-side view, right screen
6. **Line ~887** - Overlay view, right screen

For each one, follow the pattern above.

## Important Notes

- The `FloatingControlPanel` component handles dragging automatically
- Scene-specific playback controls update the shared state (isPlaying, currentFrame, playbackSpeed)
- Shared camera controls should override individual scene camera controls
- The `children` prop of FloatingControlPanel contains scene-specific controls

## Testing

After making changes:
1. Drag floating panels around - they should move smoothly
2. Use shared playback controls - both scenes should sync
3. Use scene-specific playback in floating panel - should update shared state
4. Use shared camera controls - should apply to both scenes
5. Use scene-specific controls (color, opacity) - should work independently
