# Floating Control Panels Enhancement Spec

## Overview
Enhance the floating control panels in PoseOverlayViewer to be:
1. **Draggable** - Users can drag panels around the scene
2. **Respect shared controls** - Shared camera/playback controls override individual scene controls
3. **Include scene-specific playback** - Each panel has its own playback controls for that scene

## Changes Required

### 1. Draggable Panels
- Use the new `useDraggable` hook in each floating panel
- Panels should be draggable by their header
- Dragging should not interfere with button/slider interactions
- Position should be stored in component state

### 2. Shared Controls Override
Currently, each scene has its own playback state. We need to:
- Make shared playback controls (from App.tsx) the primary source of truth
- Individual scene playback should follow the shared controls
- Scene-specific playback controls in floating panels should update the shared state

### 3. Floating Panel Structure
Each floating panel should have:
```
┌─────────────────────────────┐
│ ⋮⋮ Drag to move             │ <- Header (draggable)
├─────────────────────────────┤
│ Load Model                  │
│ [Model Cards]               │
├─────────────────────────────┤
│ Scene Playback              │
│ [▶] [====●====] [0/100]     │ <- Play button, scrubber, frame count
│ [0.25x] [0.5x] [1x] [2x]... │ <- Speed controls
├─────────────────────────────┤
│ [Additional controls]       │ <- Color, opacity, camera, etc.
└─────────────────────────────┘
```

### 4. Implementation Strategy

#### Step 1: Update PoseOverlayViewer
- Import `FloatingControlPanel` component
- Replace inline floating panel divs with `<FloatingControlPanel>` components
- Pass shared playback props to each panel
- Ensure scene-specific playback controls update shared state

#### Step 2: Update Floating Panel Rendering
For each view mode (side-by-side, overlay, comparison, single-scene):
- Replace the inline `<div>` floating panels with `<FloatingControlPanel>`
- Pass `currentFrame`, `isPlaying`, `playbackSpeed` from shared state
- Pass `onFrameChange`, `onPlayPause`, `onSpeedChange` callbacks

#### Step 3: Ensure Shared Controls Work
- Shared camera presets should apply to both scenes
- Shared playback should sync both scenes
- Individual scene controls (color, opacity, visibility) remain independent

## Files to Modify
1. `PoseOverlayViewer.tsx` - Replace 6 floating panel divs with FloatingControlPanel components
2. `App.tsx` - Ensure shared controls are properly passed down

## Files Already Created
1. `useDraggable.ts` - Hook for draggable elements
2. `FloatingControlPanel.tsx` - Reusable floating panel component
3. `FloatingControlPanel.css` - Styling for floating panels

## Testing Checklist
- [ ] Floating panels are draggable
- [ ] Dragging doesn't interfere with buttons/sliders
- [ ] Shared playback controls sync both scenes
- [ ] Shared camera controls apply to both scenes
- [ ] Scene-specific controls (color, opacity) work independently
- [ ] Model selection works in floating panels
- [ ] Speed controls work in floating panels
