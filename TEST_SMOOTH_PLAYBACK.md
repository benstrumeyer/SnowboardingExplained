# Testing Smooth Playback

## What Changed
The playback system now uses the HTML5 video element as the single source of truth for timing. This eliminates jitter and frame 0 flashing.

## How to Test

### 1. Basic Playback
- [ ] Load a video
- [ ] Click play
- [ ] Observe: Smooth playback without jitter
- [ ] Observe: Mesh frames update smoothly with video
- [ ] Observe: No frame 0 flashing

### 2. Seeking (Most Important Test)
- [ ] Play a video
- [ ] Click on different points in the timeline
- [ ] Observe: Smooth transition to new position
- [ ] Observe: Mesh updates to match video frame
- [ ] Observe: No frame backtracking
- [ ] Observe: No frame 0 flashing

### 3. Rapid Seeking
- [ ] Click rapidly on different timeline positions
- [ ] Observe: No jitter or stuttering
- [ ] Observe: Mesh stays synchronized
- [ ] Observe: No frame 0 flashing

### 4. Play/Pause
- [ ] Play video
- [ ] Pause at random points
- [ ] Resume
- [ ] Observe: Immediate response
- [ ] Observe: Mesh stays in sync

### 5. Side-by-Side Mode
- [ ] Load two videos
- [ ] Switch to side-by-side view
- [ ] Play both
- [ ] Observe: Both play smoothly
- [ ] Observe: Both meshes update smoothly
- [ ] Seek in one video
- [ ] Observe: Smooth transition

### 6. Overlay Mode
- [ ] Load two videos
- [ ] Switch to overlay mode
- [ ] Play
- [ ] Observe: Smooth playback
- [ ] Observe: Mesh overlay updates smoothly
- [ ] Adjust opacity slider
- [ ] Observe: Smooth opacity change

### 7. Comparison Mode
- [ ] Load two videos
- [ ] Switch to comparison mode
- [ ] Play
- [ ] Observe: Smooth playback
- [ ] Seek to different points
- [ ] Observe: Smooth transitions

### 8. Single Scene Mode
- [ ] Load two videos
- [ ] Switch to single-scene mode
- [ ] Play
- [ ] Observe: Both meshes visible and smooth
- [ ] Toggle visibility of each mesh
- [ ] Observe: Smooth updates

## Expected Behavior

### Before Fix
- ❌ Jittery playback
- ❌ Frame 0 flashing when seeking
- ❌ Mesh not updating smoothly
- ❌ Stuttering when seeking to different points

### After Fix
- ✅ Smooth playback from any point
- ✅ No frame 0 flashing
- ✅ Mesh updates smoothly with video
- ✅ Smooth seeking without stuttering
- ✅ Responsive play/pause
- ✅ Synchronized multi-video playback

## Performance Metrics

- **CPU Usage**: Should be lower (no independent animation loop)
- **Frame Rate**: Should be consistent (60 FPS or higher)
- **Seek Time**: Should be < 100ms
- **Memory**: Should be stable (no memory leaks)

## Troubleshooting

If you see jitter:
1. Check browser console for errors
2. Verify video file is loading correctly
3. Check network tab for slow frame data requests
4. Try a different video file

If mesh doesn't update:
1. Check that mesh data is loading (look for API calls)
2. Verify frame data is being cached
3. Check browser console for errors

If frame 0 flashing occurs:
1. This should NOT happen with the new implementation
2. If it does, check the timeupdate event listener is attached
3. Verify video element is properly initialized
