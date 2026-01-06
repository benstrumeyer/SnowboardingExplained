# Implementation Plan: Shared WebGL Renderer

## Overview

Implement a singleton SharedRendererService that manages a single WebGLRenderer for all grid cells. Each MeshViewer will register with the service and receive a scene + camera, eliminating WebGL context exhaustion.

## Tasks

- [ ] 1. Create SharedRendererService singleton
  - Create `backend/web/src/services/SharedRendererService.ts`
  - Implement singleton pattern with getInstance()
  - Define CellRenderContext interface
  - Add cell registry (Map<cellId, CellRenderContext>)
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 1.1 Write unit tests for SharedRendererService singleton
  - Test getInstance() returns same instance
  - Test multiple calls don't create multiple renderers
  - _Requirements: 1.1, 1.2_

- [ ] 2. Implement renderer initialization
  - Add initialize(containerElement) method
  - Create single THREE.WebGLRenderer
  - Create single canvas element
  - Append canvas to container
  - Start animation loop (RAF)
  - _Requirements: 4.1, 5.1_

- [ ] 2.1 Write unit tests for renderer initialization
  - Test canvas is created once
  - Test renderer is created once
  - Test animation loop starts
  - _Requirements: 4.1, 5.1_

- [ ] 3. Implement cell registration
  - Add registerCell(cellId, containerElement) method
  - Create new THREE.Scene for cell
  - Create new THREE.PerspectiveCamera for cell
  - Calculate viewport and scissor
  - Store in cell registry
  - Return scene + camera to caller
  - _Requirements: 2.1, 3.1_

- [ ] 3.1 Write unit tests for cell registration
  - Test scene is created per cell
  - Test camera is created per cell
  - Test viewport is calculated correctly
  - Test duplicate cellId throws error
  - _Requirements: 2.1, 3.1_

- [ ] 4. Implement cell unregistration
  - Add unregisterCell(cellId) method
  - Dispose scene and camera
  - Remove from cell registry
  - Don't dispose renderer (keep for other cells)
  - _Requirements: 1.3, 2.2_

- [ ] 4.1 Write unit tests for cell unregistration
  - Test scene is disposed
  - Test camera is disposed
  - Test cell removed from registry
  - Test renderer not disposed
  - _Requirements: 1.3, 2.2_

- [ ] 5. Implement viewport and scissor rendering
  - Add updateCellViewport(cellId, rect) method
  - Calculate viewport from cell position/size
  - Calculate scissor (same as viewport)
  - Update CellRenderContext
  - _Requirements: 3.1, 3.3_

- [ ] 5.1 Write unit tests for viewport calculation
  - Test viewport matches cell position
  - Test scissor matches viewport
  - Test viewport clamped to canvas bounds
  - Test zero-size cells handled gracefully
  - _Requirements: 3.1, 3.3_

- [ ] 6. Implement render loop
  - Add render() method
  - Iterate through all registered cells
  - Set viewport and scissor for each cell
  - Render cell's scene with cell's camera
  - Call render() in RAF loop
  - _Requirements: 5.2, 5.3_

- [ ] 6.1 Write unit tests for render loop
  - Test all cells rendered in single frame
  - Test viewport/scissor set correctly per cell
  - Test render called every frame
  - _Requirements: 5.2, 5.3_

- [ ] 7. Implement canvas resize handling
  - Add window resize listener
  - Update renderer size
  - Recalculate all cell viewports
  - Trigger re-render
  - _Requirements: 4.3_

- [ ] 7.1 Write unit tests for resize handling
  - Test renderer size updated
  - Test all viewports recalculated
  - Test re-render triggered
  - _Requirements: 4.3_

- [ ] 8. Implement resource cleanup
  - Add dispose() method
  - Dispose all scenes and cameras
  - Dispose renderer
  - Cancel RAF loop
  - Remove canvas from DOM
  - _Requirements: 1.4, 4.4_

- [ ] 8.1 Write unit tests for resource cleanup
  - Test all scenes disposed
  - Test all cameras disposed
  - Test renderer disposed
  - Test RAF loop cancelled
  - Test canvas removed from DOM
  - _Requirements: 1.4, 4.4_

- [ ] 9. Checkpoint - Ensure all SharedRendererService tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Update MeshViewer to use SharedRenderer
  - Remove THREE.WebGLRenderer creation
  - Remove animation loop
  - Add useEffect to register with SharedRenderer on mount
  - Receive scene + camera from SharedRenderer
  - Update mesh geometry in registered scene
  - Update camera on mouse events
  - Add useEffect to unregister on unmount
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 10.1 Write unit tests for MeshViewer integration
  - Test MeshViewer registers with SharedRenderer
  - Test MeshViewer receives scene + camera
  - Test meshes added to registered scene
  - Test camera updated on mouse events
  - Test MeshViewer unregisters on unmount
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 11. Update GridCell to initialize SharedRenderer
  - Add useEffect to initialize SharedRenderer on app mount
  - Pass container element to SharedRenderer.initialize()
  - Add useEffect to dispose SharedRenderer on app unmount
  - _Requirements: 4.1, 1.4_

- [ ] 11.1 Write unit tests for GridCell integration
  - Test SharedRenderer initialized on mount
  - Test SharedRenderer disposed on unmount
  - _Requirements: 4.1, 1.4_

- [ ] 12. Implement WebGL context loss handling
  - Listen to webglcontextlost event
  - Attempt context restoration via webglcontextrestored
  - Display error message if restoration fails
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 12.1 Write unit tests for context loss handling
  - Test context loss detected
  - Test context restoration attempted
  - Test error message displayed on failure
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 13. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Test with multiple grid cells
  - Load multiple mesh cells in grid layout
  - Verify no WebGL context exhaustion errors
  - Verify all cells render correctly
  - Verify camera controls work per cell
  - Verify mesh updates work per cell
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 5.2_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

