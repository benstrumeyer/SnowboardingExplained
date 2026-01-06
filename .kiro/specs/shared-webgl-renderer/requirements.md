# Requirements: Shared WebGL Renderer Architecture

## Introduction

The application currently creates a separate THREE.WebGLRenderer for each MeshViewer component. Browsers limit WebGL contexts to 8-16 total, causing context exhaustion when multiple mesh cells are rendered. This spec defines requirements for a shared WebGL renderer architecture that uses a single GPU context with multiple scenes, cameras, and viewports.

## Glossary

- **WebGLRenderer**: Three.js GPU context that renders to a canvas
- **Scene**: Three.js container for meshes, lights, and other 3D objects
- **Camera**: Three.js perspective or orthographic camera
- **Viewport**: Rectangular region of the canvas where a scene is rendered
- **Scissor**: Clipping rectangle that prevents rendering outside bounds
- **Grid Cell**: Individual cell in the grid layout (video or mesh viewer)
- **MeshViewer**: Component that displays a 3D mesh for a grid cell
- **SharedRenderer**: Single WebGLRenderer instance shared across all grid cells

## Requirements

### Requirement 1: Single Shared WebGL Context

**User Story:** As a developer, I want the application to use a single WebGL context for all mesh rendering, so that we don't exhaust the browser's WebGL context limit.

#### Acceptance Criteria

1. WHEN the application initializes, THE SharedRenderer SHALL create exactly one THREE.WebGLRenderer instance
2. WHEN multiple MeshViewer components are mounted, THE SharedRenderer SHALL reuse the same WebGLRenderer for all cells
3. WHEN a MeshViewer component unmounts, THE SharedRenderer SHALL NOT dispose the WebGLRenderer (only unregister the scene)
4. WHEN the application unmounts completely, THE SharedRenderer SHALL dispose the WebGLRenderer and clean up all GPU resources

### Requirement 2: Per-Cell Scene and Camera Management

**User Story:** As a developer, I want each grid cell to have its own scene and camera, so that each cell can render independently with different meshes and viewpoints.

#### Acceptance Criteria

1. WHEN a MeshViewer component mounts, THE SharedRenderer SHALL create a new THREE.Scene and THREE.PerspectiveCamera for that cell
2. WHEN a MeshViewer component unmounts, THE SharedRenderer SHALL dispose the scene and camera for that cell
3. WHEN a cell's camera is manipulated (pan, zoom, rotate), THE SharedRenderer SHALL update only that cell's camera
4. WHEN a cell's mesh data loads, THE SharedRenderer SHALL add the mesh to that cell's scene only

### Requirement 3: Viewport and Scissor Rendering

**User Story:** As a developer, I want each grid cell to render to its own rectangular region of the canvas, so that multiple cells can be rendered simultaneously without overlapping.

#### Acceptance Criteria

1. WHEN a grid cell's position and size are known, THE SharedRenderer SHALL calculate the viewport and scissor rectangles for that cell
2. WHEN rendering a frame, THE SharedRenderer SHALL set the viewport and scissor for each cell before rendering its scene
3. WHEN a grid cell is resized or repositioned, THE SharedRenderer SHALL update its viewport and scissor rectangles
4. WHEN rendering, THE SharedRenderer SHALL render all visible cells in a single animation frame

### Requirement 4: Shared Canvas and DOM Integration

**User Story:** As a developer, I want the shared renderer to manage a single canvas element, so that all grid cells render to the same canvas without creating multiple DOM elements.

#### Acceptance Criteria

1. WHEN the application initializes, THE SharedRenderer SHALL create a single canvas element and append it to a designated container
2. WHEN MeshViewer components mount, THE MeshViewer SHALL NOT create its own canvas (only register with SharedRenderer)
3. WHEN the canvas is resized, THE SharedRenderer SHALL update the renderer size and recalculate all viewports
4. WHEN the application unmounts, THE SharedRenderer SHALL remove the canvas from the DOM

### Requirement 5: Animation Loop and Frame Synchronization

**User Story:** As a developer, I want a single animation loop that renders all grid cells in sync, so that all cells update at 60fps without multiple RAF loops.

#### Acceptance Criteria

1. WHEN the application initializes, THE SharedRenderer SHALL start a single requestAnimationFrame loop
2. WHEN the loop runs, THE SharedRenderer SHALL render all registered scenes to their respective viewports
3. WHEN a MeshViewer updates its mesh data, THE SharedRenderer SHALL render the updated mesh in the next frame
4. WHEN the application unmounts, THE SharedRenderer SHALL cancel the animation loop

### Requirement 6: Backward Compatibility with MeshViewer

**User Story:** As a developer, I want MeshViewer components to work with the shared renderer without major refactoring, so that existing code continues to function.

#### Acceptance Criteria

1. WHEN a MeshViewer component mounts, THE MeshViewer SHALL register with the SharedRenderer and receive a scene and camera
2. WHEN a MeshViewer updates mesh geometry, THE MeshViewer SHALL add/update meshes in its registered scene
3. WHEN a MeshViewer handles mouse events, THE MeshViewer SHALL update its registered camera
4. WHEN a MeshViewer unmounts, THE MeshViewer SHALL unregister from the SharedRenderer

### Requirement 7: Error Handling and Fallback

**User Story:** As a developer, I want the application to handle WebGL context loss gracefully, so that users see a meaningful error message instead of a blank screen.

#### Acceptance Criteria

1. IF the WebGL context is lost, THE SharedRenderer SHALL detect the loss and emit an error event
2. WHEN context loss is detected, THE SharedRenderer SHALL attempt to restore the context
3. IF context restoration fails, THE SharedRenderer SHALL display an error message to the user
4. WHEN the context is restored, THE SharedRenderer SHALL re-render all scenes

