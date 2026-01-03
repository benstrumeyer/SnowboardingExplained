# UI Controls Revamp Implementation Tasks

## Phase 1: Core Grid System

### Task 1.1: Create GridLayout Component
- Create `backend/web/src/components/GridLayout.tsx`
- Implement grid rendering based on rows/columns configuration
- Support 1x1 to 4x4 grid layouts
- Handle cell sizing and responsive layout
- Manage cell state array

### Task 1.2: Create GridCell Component
- Create `backend/web/src/components/GridCell.tsx`
- Render individual grid cells
- Support empty, video, and mesh content types
- Manage cell-specific playback state
- Integrate with WindowedControls

### Task 1.3: Create GridConfigControls Component
- Create `backend/web/src/components/GridConfigControls.tsx`
- Add row/column adjustment controls to sidebar
- Support 1x1 to 4x4 configuration
- Handle grid resize logic
- Preserve cell content on resize

## Phase 2: Windowed Controls System

### Task 2.1: Create WindowedControls Component
- Create `backend/web/src/components/WindowedControls.tsx`
- Implement draggable panel functionality
- Add collapse/expand toggle
- Include Load Video and Load Model buttons
- Add Sync Scene toggle

### Task 2.2: Create FrameScrubber Component
- Create `backend/web/src/components/FrameScrubber.tsx`
- Implement scrubber bar at bottom of each cell
- Support click-to-seek functionality
- Support drag-to-seek functionality
- Display current frame / total frames
- Update during playback

### Task 2.3: Integrate Scrubber into GridCell
- Add FrameScrubber to GridCell component
- Connect scrubber to cell's playback state
- Handle frame position updates
- Sync scrubber with video/mesh playback

## Phase 3: Independent Playback

### Task 3.1: Create CellPlaybackState Management
- Define playback state interface for each cell
- Implement independent play/pause per cell
- Implement independent frame navigation per cell
- Implement independent playback speed per cell
- Store state in GridCell component

### Task 3.2: Update VideoToggleDisplay for Cell Integration
- Modify `backend/web/src/components/VideoToggleDisplay.tsx`
- Support original/overlay toggle
- Preserve frame position on toggle
- Sync with cell's playback state
- Handle cell-specific frame updates

### Task 3.3: Update MeshViewer for Cell Integration
- Modify `backend/web/src/components/MeshViewer.tsx`
- Support cell-specific frame updates
- Handle cell-specific camera controls
- Integrate with cell's playback state

## Phase 4: Synchronization System

### Task 4.1: Create SharedControlState Management
- Define SharedControlState interface
- Implement state in App.tsx
- Add shared frame position
- Add shared playback speed
- Add shared camera preset
- Add shared play/pause state

### Task 4.2: Create Sync Logic
- Implement sync toggle in WindowedControls
- When sync ON: cell follows shared controls
- When sync OFF: cell uses independent controls
- Handle sync state transitions
- Propagate shared control changes to synced cells

### Task 4.3: Update SharedControls Component
- Modify `backend/web/src/components/PlaybackControls.tsx` or create new SharedControls
- Add controls for shared frame position
- Add controls for shared playback speed
- Add controls for shared camera preset
- Broadcast changes to all synced cells

## Phase 5: Video Overlay Synchronization Fix

### Task 5.1: Investigate Overlay Video Sync Bug
- Debug VideoToggleDisplay component
- Check frame timing between original and overlay videos
- Verify frame rate consistency
- Check for timing drift during playback

### Task 5.2: Fix Overlay Video Sync
- Ensure overlay video uses same frame rate as original
- Synchronize frame position between original and overlay
- Handle mode switching during playback
- Ensure no desynchronization on toggle

### Task 5.3: Test Overlay Sync with Mesh
- Verify overlay video stays in sync with 3D mesh
- Test during playback
- Test during pause/resume
- Test during scrubber adjustment

## Phase 6: Content Loading

### Task 6.1: Create Model/Video Selection Interface
- Create scrollable list component for models/videos
- Display in empty cells
- Handle model selection
- Handle video selection
- Load content into specific cell

### Task 6.2: Update Content Loading Logic
- Modify upload/process endpoints to support cell-specific loading
- Load video into specific cell only
- Load model into specific cell only
- Show WindowedControls after content loads
- Hide selection list after content loads

## Phase 7: 3D Mesh Nametag Feature

### Task 7.1: Create MeshNametag Component
- Create `backend/web/src/components/MeshNametag.tsx`
- Implement 3D text rendering above mesh
- Use Three.js TextGeometry or Canvas texture
- Position above mesh center
- Make text visible from all camera angles

### Task 7.2: Create NametagControls Component
- Create `backend/web/src/components/NametagControls.tsx`
- Add text input field to WindowedControls
- Handle text input changes
- Update nametag in real-time
- Clear nametag when text is empty

### Task 7.3: Integrate Nametag into MeshViewer
- Add nametag rendering to MeshViewer
- Update nametag position with camera changes
- Scale nametag appropriately with zoom
- Ensure nametag is only for mesh scenes

## Phase 8: Integration and Polish

### Task 8.1: Update App.tsx
- Integrate GridLayout component
- Integrate GridConfigControls
- Integrate SharedControls
- Manage grid state
- Manage shared control state
- Handle cell state updates

### Task 8.2: Update Sidebar Layout
- Reorganize sidebar sections
- Add Upload Videos section
- Add Grid Configuration section
- Add Shared Camera Controls section
- Add Models list section

### Task 8.3: Responsive Design
- Ensure grid cells resize properly
- Ensure content remains visible on resize
- Handle small screen sizes
- Test on various resolutions

### Task 8.4: Bug Fixes and Polish
- Fix any remaining sync issues
- Ensure smooth interactions
- Test all features together
- Handle edge cases

## Implementation Order

1. **Phase 1** - Build grid foundation
2. **Phase 2** - Add windowed controls and scrubber
3. **Phase 3** - Implement independent playback
4. **Phase 4** - Add synchronization system
5. **Phase 5** - Fix overlay video sync bug
6. **Phase 6** - Implement content loading
7. **Phase 7** - Add nametag feature
8. **Phase 8** - Integration and polish

## Key Files to Create/Modify

### New Files
- `backend/web/src/components/GridLayout.tsx`
- `backend/web/src/components/GridCell.tsx`
- `backend/web/src/components/GridConfigControls.tsx`
- `backend/web/src/components/WindowedControls.tsx`
- `backend/web/src/components/FrameScrubber.tsx`
- `backend/web/src/components/MeshNametag.tsx`
- `backend/web/src/components/NametagControls.tsx`

### Modified Files
- `backend/web/src/App.tsx`
- `backend/web/src/components/VideoToggleDisplay.tsx`
- `backend/web/src/components/MeshViewer.tsx`
- `backend/web/src/components/PlaybackControls.tsx`
- `backend/web/src/styles/App.css`

