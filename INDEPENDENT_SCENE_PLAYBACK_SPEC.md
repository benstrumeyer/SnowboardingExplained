# Independent Scene Playback & Synchronization Spec

## Overview
Implement independent frame control for each scene while maintaining synchronized playback timing. Add ability to sync scenes to a common starting point.

## Features

### 1. Independent Frame Control
- Each scene's floating panel has its own frame slider
- Slider controls that specific scene's frame independently
- Scenes can be at different frames while playing

### 2. Synchronized Playback
- Shared play/pause button controls playback timing for all scenes
- All scenes play at the same speed (controlled by shared speed controls)
- Scenes maintain their independent frame positions while playing

### 3. Sync Scenes Button
- Located in shared camera controls
- Resets all scenes to:
  - Frame 1
  - Default camera orientation (front view)
  - Upright position
- Useful for comparing scenes from the same starting point

### 4. Video Display
- Original video displayed next to 3D scenes
- Video synced with scene playback
- Options:
  - Show original video frame-by-frame
  - Show 2D overlay of model on video (if available)

## Implementation Details

### Scene Sync Service
- Manages synchronized playback timing
- Calculates frame based on elapsed time and FPS
- Handles play/pause/speed changes

### FloatingControlPanel Updates
- Add `sceneId` prop to identify scene
- Independent frame slider for each scene
- Scene-specific frame display

### App.tsx Changes
- Add state for independent scene frames
- Add sync handler to reset scenes
- Pass scene-specific frame handlers to PoseOverlayViewer

### PoseOverlayViewer Changes
- Use independent frame states for each scene
- Pass scene-specific frame handlers to FloatingControlPanel
- Implement sync scenes functionality

## Files to Create/Modify

### New Files
- `sceneSyncService.ts` - Synchronization logic
- `SyncScenesButton.tsx` - Sync button component
- `SyncScenesButton.css` - Button styling

### Modified Files
- `App.tsx` - Add independent frame state and sync handler
- `PoseOverlayViewer.tsx` - Use independent frames, add sync button
- `FloatingControlPanel.tsx` - Add sceneId prop, independent frame control

## Testing Checklist
- [ ] Each scene's slider controls its frame independently
- [ ] Shared play button plays both scenes at same speed
- [ ] Scenes can be at different frames while playing
- [ ] Sync button resets both scenes to frame 1
- [ ] Sync button resets camera to front view
- [ ] Video displays and syncs with scenes
- [ ] Video shows original frames or 2D overlay
