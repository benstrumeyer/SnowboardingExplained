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

## Recently Completed

### 5. FloatingControlPanel Updates
- Added `onSceneFrameChange` prop for scene-specific frame control
- Updated frame slider to use scene-specific handler when available
- Maintains backward compatibility with shared frame handler

### 6. PoseOverlayViewer Updates
- Updated all 6 FloatingControlPanel instances to pass scene-specific frame handlers
- Updated frame display logic to use independent scene frames (`leftSceneFrame`, `rightSceneFrame`)
- Updated playback animation loop to advance independent scene frames
- Updated keyboard shortcuts to work with independent frames
- Integrated VideoDisplay component for synced video playback

### 7. VideoDisplay Component
- **File**: `VideoDisplay.tsx`
- **Styling**: `VideoDisplay.css`
- Syncs video playback with scene frame position
- Shows frame counter overlay
- Handles play/pause state synchronization
- Integrated into side-by-side view for both left and right scenes

## Next Steps

### To Complete Implementation:
1. Test independent frame control in browser
2. Test synchronized playback timing
3. Test sync scenes button functionality
4. Add option to show 2D overlay of model on video (if available)
5. Add video display to overlay and comparison modes

### Video Display Options:
- **Option 1**: Show original video frame-by-frame synced with scene (✓ Implemented)
- **Option 2**: Show 2D overlay of model on video (if available) - TODO
- **Option 3**: Show both with toggle - TODO

## Files Created
- `sceneSyncService.ts` - Synchronization logic
- `SyncScenesButton.tsx` - Sync button component
- `SyncScenesButton.css` - Button styling
- `VideoDisplay.tsx` - Video display component
- `VideoDisplay.css` - Video display styling
- `INDEPENDENT_SCENE_PLAYBACK_SPEC.md` - Detailed specification

## Files Modified
- `App.tsx` - Added state and sync handler
- `PoseOverlayViewer.tsx` - Updated interface, props, and frame logic
- `FloatingControlPanel.tsx` - Added scene-specific frame handler support

## Testing Checklist
- [ ] Each scene's slider controls its frame independently
- [ ] Shared play button plays both scenes at same speed
- [ ] Scenes can be at different frames while playing
- [ ] Sync button resets both scenes to frame 1
- [ ] Sync button resets camera to front view
- [ ] Sync button pauses playback
- [ ] Video displays next to scenes in side-by-side mode
- [ ] Video syncs with scene playback
- [ ] Frame counter shows correct frame numbers
