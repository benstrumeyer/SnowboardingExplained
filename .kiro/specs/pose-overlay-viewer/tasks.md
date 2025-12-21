# Pose Overlay Viewer - Implementation Tasks

## Phase 1: MVP (2 weeks, 38 hours)

### Project Setup (3 hours)
- [ ] 1. Set up web app project structure
  - Create `backend/web/` directory
  - Create React + TypeScript + Vite project
  - Install dependencies (Three.js, React, TypeScript)
  - Set up ESLint and Prettier
  - Configure environment variables
  - _Requirements: Project foundation_

### Backend API (4 hours)
- [ ] 2. Create backend API endpoint
  - Implement `GET /api/pose-overlay/mesh/:videoId/:phase`
  - Query mesh data from database
  - Return mesh frames, body proportions, metadata
  - Add error handling
  - _Requirements: Data retrieval_

### Coordinate Normalization (5 hours)
- [ ] 3. Implement coordinate space normalization
  - Create `coordinateNormalization.ts` service
  - Implement PCA-based alignment algorithm
  - Compute center of mass for each mesh
  - Rotate meshes to align principal axes
  - Unit tests for normalization logic
  - _Requirements: Mesh alignment_

### Three.js Scene Setup (6 hours)
- [ ] 4. Build Three.js scene setup
  - Create `ThreeJsScene.tsx` component
  - Initialize scene, camera, renderer
  - Set up lighting
  - Configure WebGL renderer
  - Handle window resize
  - _Requirements: 3D rendering foundation_

### Mesh Rendering (5 hours)
- [ ] 5. Implement mesh rendering
  - Create `MeshRenderer.tsx` component
  - Load mesh data and create THREE.BufferGeometry
  - Apply materials (blue for rider, orange for reference)
  - Update vertex positions each frame
  - Handle mesh visibility toggle
  - _Requirements: Mesh visualization_

### Playback Controls (6 hours)
- [ ] 6. Build global playback controls
  - Create `PlaybackControls.tsx` component
  - Play/pause button
  - Timeline scrubber
  - Speed control (0.5x, 1x, 2x)
  - Frame counter display
  - _Requirements: Global playback_

### Per-Mesh Controls (5 hours)
- [ ] 7. Build per-mesh frame offset controls
  - Create `MeshControls.tsx` component (rider)
  - Create `MeshControls.tsx` component (reference)
  - Show/hide toggle for each mesh
  - Frame offset slider (±5 frames)
  - Frame counter display
  - _Requirements: Individual mesh adjustment_

### Synchronized Playback (6 hours)
- [ ] 8. Implement synchronized playback
  - Create `useSynchronizedPlayback.ts` hook
  - Manage playback state (playing, currentFrame, speed)
  - Sync both meshes to same playback speed
  - Handle play/pause/scrub
  - Calculate display frames with offsets
  - Update meshes each frame
  - _Requirements: Playback synchronization_

### Camera Controls (4 hours)
- [ ] 9. Implement camera controls
  - Create `CameraControls.tsx` component
  - Mouse drag for rotation
  - Mouse wheel for zoom
  - Right-click drag for pan
  - Reset button
  - Touch support for mobile
  - _Requirements: Camera interaction_

### Visibility & Mode Controls (3 hours)
- [ ] 10. Build visibility and mode controls
  - Create `VisibilityToggle.tsx` component
  - Mode selector (side-by-side vs overlay)
  - Opacity slider for overlay mode
  - _Requirements: View mode selection_

### Main Components (4 hours)
- [ ] 11. Create main PoseOverlayViewer component
  - Coordinate all sub-components
  - Manage overall state
  - Handle mesh data loading
  - Error handling and loading states
  - _Requirements: Component orchestration_

### Data Service (3 hours)
- [ ] 12. Create mesh data service
  - Create `meshDataService.ts`
  - Fetch mesh data from backend API
  - Cache mesh data locally
  - Handle network errors
  - _Requirements: Data management_

### App Setup (2 hours)
- [ ] 13. Build main App component
  - Create `App.tsx`
  - Set up routing (if needed)
  - Load PoseOverlayViewer
  - Handle global state
  - _Requirements: Application entry point_

### Testing (8 hours)
- [ ] 14. Write unit tests
  - Test coordinate normalization
  - Test frame offset calculations
  - Test playback logic
  - Test time normalization
  - Aim for > 80% coverage
  - _Requirements: Code quality_

- [ ] 15. Write integration tests
  - Test mesh loading from API
  - Test rendering in Three.js
  - Test synchronized playback
  - Test all controls
  - _Requirements: System integration_

### Optimization & Deployment (6 hours)
- [ ] 16. Performance optimization
  - Profile rendering performance
  - Optimize if needed (LOD, culling)
  - Test on target devices
  - Benchmark FPS
  - _Requirements: Performance targets_

- [ ] 17. Mobile responsiveness
  - Test on mobile browsers
  - Adjust UI for small screens
  - Test touch controls
  - Optimize for mobile performance
  - _Requirements: Mobile support_

- [ ] 18. Deploy to Vercel/Netlify
  - Set up deployment pipeline
  - Configure environment variables
  - Deploy MVP
  - Test in production
  - _Requirements: Production deployment_

- [ ] 19. Checkpoint - Verify MVP
  - Run full test suite
  - Fix any failing tests
  - Verify MVP functionality
  - Get user feedback
  - _Requirements: Quality assurance_

---

## Phase 2: Enhanced Features (1 week, 20 hours)

- [ ] 20. Implement overlay mode rendering
  - Modify ThreeJsScene to support overlay
  - Render both meshes in same 3D space
  - Make reference mesh semi-transparent
  - Add toggle in VisibilityToggle
  - Test alignment
  - _Requirements: Overlay visualization_

- [ ] 21. Implement in-place motion mode
  - Create in-place transform utility
  - Remove global translation
  - Keep rotation and joint movement
  - Add toggle in UI
  - Test with spinning tricks
  - _Requirements: Motion analysis_

- [ ] 22. Add frame-by-frame navigation
  - Add arrow key support
  - Add frame-by-frame buttons
  - Update UI to show current frame
  - _Requirements: Frame control_

- [ ] 23. Add keyboard shortcuts
  - Space = play/pause
  - Arrow keys = frame navigation
  - R = reset camera
  - M = toggle mode
  - _Requirements: Keyboard support_

- [ ] 24. Improve camera controls
  - Add zoom limits
  - Add pan limits
  - Smooth camera transitions
  - Better touch support
  - _Requirements: Camera refinement_

- [ ] 25. Checkpoint - Verify Phase 2
  - Run full test suite
  - Fix any failing tests
  - Verify Phase 2 functionality
  - Get user feedback
  - _Requirements: Quality assurance_

---

## Phase 3: Body Proportion Scaling (1 week, 15 hours)

- [ ] 26. Implement skeleton scaler utility
  - Create `skeletonScaler.ts`
  - Scale mesh by proportion ratio
  - Handle edge cases
  - Unit tests
  - _Requirements: Scaling logic_

- [ ] 27. Add scale toggle to UI
  - Add "Scale to Rider" toggle
  - Show scale factor (e.g., "0.92x")
  - Update mesh when toggle changes
  - _Requirements: Scaling control_

- [ ] 28. Add visual feedback
  - Show scale factor in UI
  - Highlight when scaling is active
  - Show proportion mismatch warning if > 15%
  - _Requirements: User feedback_

- [ ] 29. Test scaling accuracy
  - Visual validation with real data
  - Compare scaled vs unscaled
  - Get coach feedback
  - _Requirements: Validation_

- [ ] 30. Checkpoint - Verify Phase 3
  - Run full test suite
  - Fix any failing tests
  - Verify Phase 3 functionality
  - Get user feedback
  - _Requirements: Quality assurance_

---

## Phase 4: Polish & Optimization (1 week, 20 hours)

- [ ] 31. Performance profiling
  - Profile rendering performance
  - Identify bottlenecks
  - Optimize if needed
  - Benchmark FPS on target devices
  - _Requirements: Performance_

- [ ] 32. Improve visualization
  - Better lighting and materials
  - Improved color scheme
  - Better joint labels (optional)
  - Improved UI layout
  - _Requirements: Visual polish_

- [ ] 33. Add help/tutorial
  - Create help overlay
  - Explain controls
  - Show keyboard shortcuts
  - Provide usage tips
  - _Requirements: User guidance_

- [ ] 34. Create user documentation
  - User guide for coaches
  - API documentation
  - Deployment guide
  - Troubleshooting guide
  - _Requirements: Documentation_

- [ ] 35. Create developer documentation
  - Code comments
  - Architecture overview
  - Component documentation
  - Setup instructions
  - _Requirements: Developer guide_

- [ ] 36. Final testing
  - Full regression testing
  - Performance testing
  - Mobile testing
  - Browser compatibility testing
  - _Requirements: Comprehensive testing_

- [ ] 37. Final deployment
  - Deploy to production
  - Verify all features work
  - Monitor for errors
  - Get coach feedback
  - _Requirements: Production release_

- [ ] 38. Checkpoint - Final verification
  - Run full test suite
  - Fix any failing tests
  - Verify all functionality
  - Get user feedback
  - _Requirements: Final QA_

---

## Testing Strategy

### Unit Tests
- Coordinate normalization (PCA alignment)
- Frame offset calculations
- Playback logic
- Time normalization
- Skeleton scaling

### Integration Tests
- Load mesh data from API
- Render in Three.js
- Synchronized playback
- All controls work correctly

### Visual Tests
- Mesh alignment (visual inspection)
- Scaling accuracy (compare to reference)
- Camera controls (manual testing)
- Mode switching (visual verification)

### Performance Tests
- Rendering FPS (target: 60fps desktop, 30-60fps mobile)
- Memory usage (target: < 100MB)
- Load time (target: < 2 seconds)

---

## Success Criteria

### MVP Success
- [ ] Load two mesh sequences
- [ ] Render side-by-side in Three.js
- [ ] Synchronized playback with frame offsets
- [ ] Play/pause/scrub controls work
- [ ] Per-mesh frame offset controls work
- [ ] Camera rotation works
- [ ] 60fps on desktop, 30-60fps on mobile
- [ ] Mobile responsive

### Full Feature Success
- [ ] Overlay mode works correctly
- [ ] In-place mode removes translation properly
- [ ] Body proportion scaling is accurate
- [ ] All controls are intuitive
- [ ] Documentation is complete
- [ ] Coaches validate usefulness

---

## Timeline

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| Phase 1: MVP | 2 weeks | 1-19 | Not started |
| Phase 2: Enhanced | 1 week | 20-25 | Not started |
| Phase 3: Scaling | 1 week | 26-30 | Not started |
| Phase 4: Polish | 1 week | 31-38 | Not started |
| **Total** | **5 weeks** | **38 tasks** | **Not started** |

---

## Notes

- Each task should be completed before moving to the next
- Tests should be written as you implement features
- Get coach feedback after MVP is deployed
- Iterate based on feedback
- Focus on core functionality first, polish later

