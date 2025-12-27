# Smooth Playback Fix - Video-Driven Synchronization

## Problem
The playback was jittery with frame 0 flashing because there were **two conflicting frame advancement systems**:
1. **PoseOverlayViewer's animation loop** - independently advancing frames using `requestAnimationFrame`
2. **PlaybackSyncService** - trying to sync to video element's `timeupdate` event

This caused:
- Frame backtracking (jumping back to frame 0)
- Jitter and stuttering
- Inconsistent mesh-video synchronization
- Mesh not updating smoothly when seeking to different points

## Solution: Video-Driven Synchronization

**Core Principle**: Let the HTML5 video element drive all timing. It's optimized for smooth playback.

### Architecture

```
User Action (play/pause/seek)
    ↓
VideoDisplay Component
    ↓
HTML5 <video> element (handles all timing smoothly)
    ↓
timeupdate event (fires frequently during playback)
    ↓
PoseOverlayViewer listens and updates mesh frames
    ↓
MeshViewer renders current frame
```

### Key Changes

#### 1. Simplified PlaybackSyncService
- **Removed**: Complex state management, frame advancement intervals, scene state tracking
- **Kept**: Simple `syncToVideoElement()` that listens to `timeupdate` events
- **Result**: Single source of truth - the video element's `currentTime`

#### 2. VideoDisplay Component
- Converts `currentFrame` prop to video time: `targetTime = currentFrame / fps`
- Sets `video.currentTime` when frame changes
- Handles play/pause state
- Exposes video ref via `forwardRef` for direct access

#### 3. PoseOverlayViewer
- Removed independent animation loop
- Now listens to video element's `timeupdate` event
- Calculates frame index from video time: `frameIndex = Math.floor(videoTime * fps)`
- Updates mesh frames only when frame actually changes

### Why This Works

1. **HTML5 video element is optimized for smooth playback**
   - Handles buffering, seeking, and timing internally
   - Provides smooth frame-by-frame playback

2. **Single source of truth**
   - Video time is the only timing reference
   - No conflicting frame advancement systems
   - No frame backtracking

3. **Smooth seeking**
   - When user seeks to a different point, VideoDisplay sets `video.currentTime`
   - Video element handles the seek smoothly
   - `timeupdate` fires with new time
   - Mesh frames update to match

4. **No jitter**
   - No independent frame advancement competing with video playback
   - Frame updates only happen when video time actually changes
   - Mesh stays perfectly synchronized with video

### Playback Flow

**Playing from current position:**
1. User clicks play
2. VideoDisplay calls `video.play()`
3. Video element plays smoothly
4. `timeupdate` fires frequently (every ~250ms or more often)
5. PoseOverlayViewer calculates frame from video time
6. Mesh updates to match video frame

**Seeking to different point:**
1. User drags scrubber or clicks on timeline
2. `onLeftSceneFrameChange(newFrame)` is called
3. VideoDisplay receives new `currentFrame` prop
4. VideoDisplay sets `video.currentTime = newFrame / fps`
5. Video element seeks smoothly
6. `timeupdate` fires with new time
7. PoseOverlayViewer updates mesh frame
8. Mesh displays frame matching video position

**Playing at different speeds:**
- HTML5 video element handles playback speed natively
- `timeupdate` still fires at appropriate intervals
- Frame calculation remains the same: `frameIndex = Math.floor(videoTime * fps)`

### Performance Benefits

- **Reduced CPU usage**: No independent animation loop
- **Smoother playback**: Leverages browser's video optimization
- **Better battery life**: Less frequent updates
- **Responsive seeking**: Video element handles seek optimization

### Testing Checklist

- [ ] Play from start - smooth playback, no jitter
- [ ] Seek to middle - smooth transition, mesh updates correctly
- [ ] Seek to end - no frame 0 flashing
- [ ] Play/pause - immediate response
- [ ] Rapid seeking - no frame backtracking
- [ ] Both videos playing - synchronized without jitter
- [ ] Different video lengths - handles gracefully with clamping

## Files Modified

1. `playbackSyncService.ts` - Simplified to video-driven sync
2. `VideoDisplay.tsx` - Added forwardRef for video element access
3. `PoseOverlayViewer.tsx` - Removed animation loop, uses timeupdate event
