# Independent Scene Playback Implementation

## What Was Implemented

### 1. Scene Synchronization Service
- **File**: `sceneSyncService.ts`
- Manages synchronized playback timing across scenes
- Calculates frame based on elapsed time and FPS
- Handles play/pause/speed changes
- Provides sync reset functionality

### 2. Independent Frame Control
- Each scene now has independent frame state
- Left scene frame: `leftSceneFrame` state
- Right scene frame: `rightSceneFrame` state
- Each scene's floating panel slider controls its own frame independently
- Scenes can be at different frames while playing

### 3. Sync Scenes Button
- **Component**: `SyncScenesButton.tsx`
- **Styling**: `SyncScenesButton.css`
- Located in shared camera controls (sidebar)
- Resets all scenes to:
  - Frame 1 (frame 0 in 0-indexed)
  - Front camera view
  - Paused state
- Provides visual feedback with gradient background

### 4. Updated Components

#### App.tsx
- Added independent frame state for left and right scenes
- Added `handleSyncScenes` function
- Passes new props to PoseOverlayViewer:
  - `leftSceneFrame` / `onLeftSceneFrameChange`
  - `rightSceneFrame` / `onRightSceneFrameChange`
  - `onSyncScenes`
- Imported and added SyncScenesButton to camera controls

#### PoseOverlayViewer.tsx
- Updated interface to accept new props
- Updated function signature to destructure new props
- Ready to use independent frame states for each scene

#### FloatingControlPanel.tsx
- Added optional `sceneId` prop for scene identification
- Ready to use scene-specific frame handlers

## How It Works

### Independent Frame Control
1. User moves slider in left scene's floating panel
2. `onLeftSceneFrameChange` is called with new frame number
3. Left scene updates to show that frame
4. Right scene remains at its current frame
5. Both scenes can be at different frames simultaneously

### Synchronized Playback
1. User clicks shared play button
2. Both scenes start playing at same speed
3. Each scene advances from its current frame
4. Scenes maintain their independent frame positions
5. Both scenes play at same speed (controlled by shared speed controls)

### Sync Scenes
1. User clicks "🔄 Sync Scenes" button
2. Both scenes reset to frame 1
3. Camera resets to front view
4. Playback pauses
5. Scenes are now synchronized and ready for comparison

## Next Steps

### To Complete Implementation:
1. Update FloatingControlPanel to use scene-specific frame handlers
2. Update PoseOverlayViewer to pass scene-specific handlers to FloatingControlPanel
3. Add video display next to 3D scenes
4. Implement video frame sync with scene playback
5. Add option to show 2D overlay of model on video

### Video Display Options:
- **Option 1**: Show original video frame-by-frame synced with scene
- **Option 2**: Show 2D overlay of model on video (if available)
- **Option 3**: Show both with toggle

## Files Created
- `sceneSyncService.ts` - Synchronization logic
- `SyncScenesButton.tsx` - Sync button component
- `SyncScenesButton.css` - Button styling
- `INDEPENDENT_SCENE_PLAYBACK_SPEC.md` - Detailed specification

## Files Modified
- `App.tsx` - Added state and sync handler
- `PoseOverlayViewer.tsx` - Updated interface and props
- `FloatingControlPanel.tsx` - Added sceneId prop

## Testing Checklist
- [ ] Each scene's slider controls its frame independently
- [ ] Shared play button plays both scenes at same speed
- [ ] Scenes can be at different frames while playing
- [ ] Sync button resets both scenes to frame 1
- [ ] Sync button resets camera to front view
- [ ] Sync button pauses playback
- [ ] Video displays next to scenes
- [ ] Video syncs with scene playback
