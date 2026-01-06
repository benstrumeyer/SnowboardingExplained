# Design: Shared WebGL Renderer Architecture

## Overview

This design implements a single shared WebGLRenderer for the entire application, eliminating WebGL context exhaustion. Instead of each MeshViewer creating its own renderer, all grid cells render to a single canvas using separate scenes, cameras, and viewports. This reduces GPU context usage from O(n) to O(1) where n is the number of grid cells.

## Architecture

```
SharedRendererService (Singleton)
├── Single THREE.WebGLRenderer
├── Single Canvas Element
├── Animation Loop (RAF)
└── Cell Registry
    ├── Cell 1: Scene + Camera + Viewport
    ├── Cell 2: Scene + Camera + Viewport
    └── Cell N: Scene + Camera + Viewport

MeshViewer Components
├── Register with SharedRenderer on mount
├── Receive Scene + Camera reference
├── Add/update meshes in their scene
├── Handle mouse events for their camera
└── Unregister on unmount
```

## Components and Interfaces

### SharedRendererService

**Purpose:** Manages the single WebGLRenderer, canvas, and all registered cell scenes/cameras.

**Key Methods:**
- `getInstance()` - Get singleton instance
- `initialize(containerElement)` - Create renderer and canvas
- `registerCell(cellId, containerElement)` - Register a grid cell, return scene + camera
- `unregisterCell(cellId)` - Unregister a cell
- `updateCellViewport(cellId, rect)` - Update cell's viewport/scissor
- `render()` - Render all cells in single frame
- `dispose()` - Clean up all resources

**Key Properties:**
- `renderer: THREE.WebGLRenderer` - Shared GPU context
- `canvas: HTMLCanvasElement` - Single canvas element
- `cells: Map<cellId, CellRenderContext>` - Registered cells
- `rafId: number` - Animation loop ID

### CellRenderContext

**Purpose:** Encapsulates scene, camera, and viewport for a single grid cell.

```typescript
interface CellRenderContext {
  cellId: string;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  viewport: { x: number; y: number; width: number; height: number };
  scissor: { x: number; y: number; width: number; height: number };
  containerElement: HTMLElement;
}
```

### Updated MeshViewer

**Changes:**
- Remove `THREE.WebGLRenderer` creation
- Remove animation loop
- Register with SharedRenderer on mount
- Receive scene + camera from SharedRenderer
- Add meshes to registered scene
- Update camera on mouse events
- Unregister on unmount

## Data Models

### Viewport Calculation

For each grid cell, calculate viewport and scissor based on:
- Cell's position in DOM (getBoundingClientRect)
- Canvas size
- Device pixel ratio

```
viewport.x = cellRect.left / canvasWidth * canvasWidth
viewport.y = (canvasHeight - cellRect.bottom) / canvasHeight * canvasHeight
viewport.width = cellRect.width
viewport.height = cellRect.height
```

### Scissor Calculation

Scissor is identical to viewport (clipping rectangle).

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Single WebGL Context

*For any* application state, there SHALL be exactly one THREE.WebGLRenderer instance active.

**Validates: Requirements 1.1, 1.2**

### Property 2: Scene Isolation

*For any* grid cell, meshes added to that cell's scene SHALL NOT appear in other cells' scenes.

**Validates: Requirements 2.1, 2.4**

### Property 3: Viewport Correctness

*For any* grid cell with known position and size, the viewport and scissor rectangles SHALL match the cell's DOM position and size.

**Validates: Requirements 3.1, 3.3**

### Property 4: Frame Synchronization

*For any* animation frame, all registered cells SHALL be rendered exactly once in that frame.

**Validates: Requirements 5.2, 5.3**

### Property 5: Resource Cleanup

*For any* grid cell that unmounts, its scene and camera resources SHALL be disposed and no longer rendered.

**Validates: Requirements 1.3, 2.2**

### Property 6: Canvas Lifecycle

*For any* application lifecycle, the canvas SHALL be created once on initialization and removed once on disposal.

**Validates: Requirements 4.1, 4.4**

## Error Handling

**WebGL Context Loss:**
- Listen to `webglcontextlost` event on canvas
- Attempt context restoration via `webglcontextrestored` event
- Display error message if restoration fails

**Invalid Cell Registration:**
- Validate cellId is unique before registering
- Throw error if duplicate cellId registered
- Log warning if unregistering non-existent cell

**Viewport Calculation Errors:**
- Handle cells with zero width/height
- Clamp viewport to canvas bounds
- Skip rendering cells outside canvas

## Testing Strategy

### Unit Tests

- Test SharedRendererService singleton pattern
- Test cell registration/unregistration
- Test viewport calculation with various cell positions
- Test scene isolation (mesh in one scene doesn't appear in another)
- Test resource cleanup on cell unmount

### Property-Based Tests

- **Property 1:** Generate random application states, verify exactly one renderer exists
- **Property 2:** Generate random mesh additions to cells, verify isolation
- **Property 3:** Generate random cell positions/sizes, verify viewport matches DOM
- **Property 4:** Generate random frame sequences, verify all cells rendered once per frame
- **Property 5:** Generate random mount/unmount sequences, verify resources cleaned up
- **Property 6:** Generate random app lifecycle events, verify canvas created/removed correctly

### Integration Tests

- Test multiple MeshViewer components rendering simultaneously
- Test camera controls on individual cells
- Test mesh updates on individual cells
- Test grid layout changes (resize, reposition)
- Test context loss and restoration

