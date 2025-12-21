# Pose Overlay & Comparison Viewer - Product Specification

## Executive Summary

A 3D pose visualization tool that lets riders compare their movement against a coach or pro by viewing two pose models side-by-side or overlaid, independent of camera angle, body size, or video perspective. This solves the core problem: "My coach is 6' and I'm 5'6" - how do I actually copy his form?"

**Key Value**: Makes abstract coaching advice ("bend your legs more") visually concrete and measurable.

**Scope**: Standalone feature that works with existing 3D pose output from the backend. No new ML required.

---

## Problem Statement

### Current Pain Points

1. **Body Size Mismatch**: Coach is 6', rider is 5'6". Copying form directly doesn't work because proportions are different.
2. **Camera Angle Limitation**: Coach's video is shot from one angle, rider's from another. Can't directly compare.
3. **Abstract Coaching**: "Bend your legs more" - how much? Coach can't easily show the exact amount.
4. **Video Comparison Fails**: Two videos side-by-side don't align because:
   - Different frame rates
   - Different video lengths
   - Different camera positions
   - Different body sizes

### Why This Matters

- Riders waste time trying to copy form that doesn't work for their body
- Coaches can't give precise, visual feedback
- Learning is slower and more frustrating

---

## Solution Overview

### Core Concept

1. Extract 3D pose skeletons from two videos (rider + coach/pro)
2. Normalize both into a shared 3D coordinate space
3. Optionally scale the reference pose to match rider's body proportions
4. Render both skeletons in Three.js with full camera freedom
5. Align playback by normalized phase time (not raw frames)

### What This Enables

- **Body Size Normalization**: Shrink coach's model to rider's height, overlay on top
- **Camera Freedom**: Rotate, zoom, pan to see movement from any angle
- **Phase-Aligned Playback**: Key moments (takeoff, peak, landing) snap together
- **In-Place Motion Mode**: Remove global translation to see pure rotation/movement
- **Interactive Comparison**: Toggle visibility, scrub, pause, compare specific frames

---

## Feature Set

### 1. Dual Rendering Modes

#### Side-by-Side Mode
- Rider skeleton on left, reference on right
- Both rendered at same scale (or normalized scale)
- Synchronized playback
- Use case: See overall movement differences

#### Overlay Mode
- Both skeletons in same 3D space
- Reference skeleton ghosted/semi-transparent (e.g., 40% opacity)
- Rider skeleton solid/opaque
- Color-coded: Rider = blue, Reference = orange
- Use case: See exact position differences, identify misalignments

### 2. Synchronized Playback with Individual Frame Offset Controls

**Problem**: Rider's takeoff might be frame 45, coach's might be frame 56. Raw frame numbers don't align. Users need fine-grained control to perfectly align meshes.

**Solution**: 
- Both meshes play simultaneously at the same playback speed
- Each mesh has independent frame offset slider (±N frames)
- User adjusts offsets to perfectly align key moments
- Synchronized playback ensures they stay in sync once aligned

**Implementation**:
```
Rider video: frames 45-78 (takeoff phase)
Coach video: frames 56-85 (takeoff phase)

Initial state:
- Rider offset: 0 frames
- Coach offset: 0 frames

User adjusts offsets:
- Rider offset: 0 frames (no change)
- Coach offset: -5 frames (shifts coach earlier by 5 frames)

When playing at frame 50:
- Show rider frame 50
- Show coach frame 45 (50 - 5)

User can play both together, scrub timeline, or adjust offsets to fine-tune alignment
```

### 3. Camera Freedom (Three.js Advantage)

- **Rotate**: Full 360° rotation around skeleton
- **Zoom**: Zoom in/out to see details
- **Pan**: Move camera left/right/up/down
- **Reset**: Return to default view

**Use Cases**:
- See rotation axes (especially for spins)
- Check posture from side view
- Inspect arm/shoulder movement from behind
- Verify alignment from top-down view

### 4. In-Place Motion Mode

**Problem**: Global translation (moving through space) obscures the actual movement pattern.

**Solution**: Optional mode that removes translation
- Model stays centered in 3D space
- Only rotation and joint movement visible
- Especially useful for:
  - Spins (see rotation sequencing)
  - Aerial tricks (see body alignment)
  - Arm/shoulder movement (see coordination)

**Implementation**:
```
Normal mode:
- Skeleton moves through 3D space as rider moves

In-place mode:
- Center of mass stays at origin
- Only relative joint movements visible
- Rotation around center preserved
```

### 5. Interactive Controls

**Playback**:
- Play/pause
- Scrub timeline (drag to specific frame)
- Speed control (0.5x, 1x, 2x)
- Frame-by-frame navigation (← →)

**Per-Mesh Adjustment**:
- Frame offset slider (±N frames) for each mesh
- Rotation adjustment (X, Y, Z axes) for each mesh
- Ensures both meshes start at same position/orientation

**Visibility**:
- Toggle rider skeleton on/off
- Toggle reference skeleton on/off
- Toggle in-place mode
- Toggle overlay/side-by-side

**Comparison**:
- Show/hide numeric deltas (later feature)
- Highlight specific body parts
- Show velocity vectors (later feature)

### 6. 3D Mesh Visualization

- Full 3D mesh models (same as existing pose service)
- Rider mesh in one color (e.g., blue)
- Reference mesh in another color (e.g., orange, semi-transparent in overlay mode)
- Real-time mesh rendering at 60fps
- Optional mesh transparency/opacity control
- No clutter, clean UI

---

## Technical Architecture

### Data Flow

```
Coach video (MP4)
  ↓
Pose extraction (existing backend - HMR2)
  ↓
3D mesh model + keypoints
  ↓
Extract body proportions
  ↓
Store in database

---

Rider video (MP4)
  ↓
Pose extraction (existing backend - HMR2)
  ↓
3D mesh model + keypoints
  ↓
Extract body proportions
  ↓
Store in database

---

Viewer loads both meshes
  ↓
Normalize to shared coordinate space
  ↓
Optionally scale reference to match rider proportions
  ↓
Render in Three.js (full 3D mesh models)
  ↓
Synchronized playback at normalized phase time
```

### Component Architecture

```
PoseOverlayViewer (main component)
├── Three.js Scene
│   ├── MeshRenderer (rider)
│   │   ├── Load mesh data from pose service
│   │   ├── Create geometry from vertices/faces
│   │   ├── Apply material (blue color)
│   │   └── Update pose each frame
│   ├── MeshRenderer (reference)
│   │   ├── Load mesh data from pose service
│   │   ├── Create geometry from vertices/faces
│   │   ├── Apply material (orange color, semi-transparent in overlay)
│   │   └── Update pose each frame
│   └── Camera controller
├── PlaybackControls
│   ├── Play/pause
│   ├── Timeline scrubber
│   └── Speed control
├── VisibilityToggle
│   ├── Show/hide rider mesh
│   ├── Show/hide reference mesh
│   ├── Mode selector (side-by-side vs overlay)
│   └── Opacity control (for overlay mode)
└── CameraControls
    ├── Rotate
    ├── Zoom
    ├── Pan
    └── Reset
```

### Data Structures

```typescript
interface MeshFrame {
  frameNumber: number;
  timestamp: number; // milliseconds
  vertices: number[][]; // 3D vertex positions [[x,y,z], [x,y,z], ...]
  faces: number[][]; // Triangle indices [[v0,v1,v2], [v0,v1,v2], ...]
  normals?: number[][]; // Optional vertex normals for lighting
}

interface SkeletonFrame {
  frameNumber: number;
  timestamp: number; // milliseconds
  joints: {
    [jointName: string]: {
      x: number;
      y: number;
      z: number;
      confidence: number;
    };
  };
}

interface MeshSequence {
  id: string;
  videoId: string;
  trick: string;
  phase: string;
  frameStart: number;
  frameEnd: number;
  fps: number;
  frames: MeshFrame[];
  bodyProportions: {
    height: number;
    armLength: number;
    legLength: number;
    torsoLength: number;
    shoulderWidth: number;
    hipWidth: number;
  };
}

interface PoseComparisonState {
  riderMesh: MeshSequence;
  referenceMesh: MeshSequence;
  normalizedTime: number; // [0, 1]
  mode: 'side-by-side' | 'overlay';
  inPlaceMode: boolean;
  showRider: boolean;
  showReference: boolean;
  referenceOpacity: number; // [0, 1], for overlay mode
  cameraPosition: {x, y, z};
  cameraRotation: {x, y, z};
}
```

### 3. Three.js Scene Setup

```typescript
// Pseudo-code for Three.js setup

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});

// Load mesh data from pose service (vertices, faces, normals)
const riderMeshData = await fetchMeshData(riderVideoId, riderFrame);
const referenceMeshData = await fetchMeshData(referenceVideoId, referenceFrame);

// Create mesh geometries
const riderGeometry = createGeometryFromMesh(riderMeshData);
const referenceGeometry = createGeometryFromMesh(referenceMeshData);

// Create materials with colors
const riderMaterial = new THREE.MeshPhongMaterial({color: 0x0066ff}); // Blue
const referenceMaterial = new THREE.MeshPhongMaterial({color: 0xff9900}); // Orange

// Create mesh objects
const riderMesh = new THREE.Mesh(riderGeometry, riderMaterial);
const referenceMesh = new THREE.Mesh(referenceGeometry, referenceMaterial);

scene.add(riderMesh);
scene.add(referenceMesh);

// Normalize coordinate spaces
normalizeSkeletons(riderMesh, referenceMesh);

// Optional: scale reference to match rider proportions
if (scaleToRider) {
  scaleSkeletonProportions(referenceMesh, riderProportions);
}

// Render loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update mesh positions based on normalized time
  const riderFrame = interpolateFrame(riderFrames, normalizedTime);
  const referenceFrame = interpolateFrame(referenceFrames, normalizedTime);
  
  updateMeshPose(riderMesh, riderFrame);
  updateMeshPose(referenceMesh, referenceFrame);
  
  renderer.render(scene, camera);
}
```

---

## Implementation Plan

### Phase 1: MVP (2 weeks)

**Goal**: Basic side-by-side skeleton rendering with synchronized playback

**Deliverables**:
- [ ] `backend/mobile/src/screens/PoseOverlayViewerScreen.tsx` - Main screen
- [ ] `backend/mobile/src/components/ThreeJsSkeletonRenderer.tsx` - Three.js component
- [ ] `backend/mobile/src/components/PlaybackControls.tsx` - Play/pause/scrub
- [ ] `backend/mobile/src/services/skeletonNormalizationService.ts` - Coordinate space normalization
- [ ] `backend/api/pose-overlay.ts` - API endpoints to fetch skeleton data
- [ ] Unit tests for normalization logic

**Features**:
- Load two skeleton sequences
- Render side-by-side in Three.js
- Synchronized playback at normalized phase time
- Play/pause/scrub controls
- Basic camera rotation

**Effort**: 40 hours

**Blockers**: None (uses existing pose data)

---

### Phase 2: Enhanced Visualization (1 week)

**Goal**: Add overlay mode, in-place mode, better controls

**Deliverables**:
- [ ] Overlay mode rendering
- [ ] In-place motion mode
- [ ] Visibility toggles
- [ ] Speed control
- [ ] Frame-by-frame navigation
- [ ] Better camera controls (zoom, pan, reset)

**Effort**: 20 hours

---

### Phase 3: Body Proportion Scaling (1 week)

**Goal**: Scale reference skeleton to match rider's body proportions

**Deliverables**:
- [ ] `backend/src/utils/skeletonScaler.ts` - Scale skeleton by proportions
- [ ] UI toggle to enable/disable scaling
- [ ] Visual feedback showing scale factor

**Effort**: 15 hours

---

### Phase 4: Polish & Optimization (1 week)

**Goal**: Performance, UX refinement, documentation

**Deliverables**:
- [ ] Performance optimization (LOD, culling)
- [ ] Better joint labels and visualization
- [ ] Keyboard shortcuts
- [ ] Mobile responsiveness
- [ ] Documentation and user guide

**Effort**: 20 hours

---

## Feasibility Assessment

### ✅ Highly Feasible

**Why**:
1. **Existing Data**: You already have 3D pose output from the backend
2. **No New ML**: Uses existing pose extraction, no new models needed
3. **Proven Tech**: Three.js is mature and well-documented
4. **Incremental**: Can ship MVP without all features
5. **Reusable**: Works across sports (not just snowboarding)

### Technical Risks (Low)

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Three.js performance with many frames | Low | Use LOD, frame culling, WebGL optimization |
| Coordinate space normalization bugs | Low | Thorough unit tests, visual validation |
| Mobile rendering performance | Medium | Test on target devices, optimize shaders |
| Skeleton interpolation artifacts | Low | Use smooth interpolation (Catmull-Rom) |

### Timeline Estimate

- **MVP (Phase 1)**: 2 weeks (40 hours)
- **Enhanced (Phase 2)**: 1 week (20 hours)
- **Scaling (Phase 3)**: 1 week (15 hours)
- **Polish (Phase 4)**: 1 week (20 hours)
- **Total**: 5 weeks (95 hours)

**Can ship MVP in 2 weeks** with core features working.

---

## Success Criteria

### MVP Success
- [ ] Load two skeleton sequences
- [ ] Render side-by-side in Three.js
- [ ] Synchronized playback at normalized time
- [ ] Play/pause/scrub controls work
- [ ] Camera rotation works
- [ ] No performance issues on target devices

### Full Feature Success
- [ ] Overlay mode works correctly
- [ ] In-place mode removes translation properly
- [ ] Body proportion scaling is accurate
- [ ] All controls are intuitive
- [ ] Documentation is complete
- [ ] Coaches validate usefulness

---

## Competitive Advantage

### Why This Matters

1. **Solves Real Problem**: Body size mismatch is a major pain point for riders
2. **Cross-Sport**: Works for any sport with pose data (gymnastics, dance, martial arts, etc.)
3. **Standalone Feature**: Can be marketed independently or as part of larger platform
4. **Resume Bullet**: "Built 3D pose comparison tool used by [X] athletes"
5. **B2B Potential**: Coaches, gyms, sports teams would pay for this

### Market Positioning

- **For Riders**: "See exactly how your form compares to pros, adjusted for your body size"
- **For Coaches**: "Show riders exactly what to change with visual feedback"
- **For Sports Teams**: "Standardize technique across athletes with different body types"

---

## Integration with Temporal Signal Sequences

This viewer complements the temporal signal sequences feature:

- **Temporal Signals**: Gives numerical feedback ("arm snap is 15°/frame too slow")
- **Pose Overlay Viewer**: Gives visual feedback ("here's exactly what it should look like")

Together they create a complete coaching system:
1. Upload perfect reference video
2. Upload rider attempt
3. See visual comparison (overlay viewer)
4. See numerical feedback (temporal signals)
5. Rider adjusts form
6. Repeat

---

## Next Steps

### Option 1: Build MVP Now
- Start Phase 1 immediately
- Ship basic side-by-side viewer in 2 weeks
- Get coach feedback
- Iterate based on feedback

### Option 2: Spec Out V1/V2 Split
- Define exactly what goes in MVP vs later phases
- Create detailed task breakdown
- Estimate effort more precisely

### Option 3: Sketch Three.js Architecture
- Create detailed component diagrams
- Define data flow precisely
- Identify potential performance bottlenecks

**Recommendation**: Start with Option 1 (MVP). The feature is straightforward enough that you can build and learn simultaneously. Get it in front of coaches quickly to validate the idea.

---

## Appendix: Example Use Case

### Scenario: Ben Learning Backside 360

**Current Workflow** (painful):
1. Ben watches coach's backside 360 video
2. Coach says "bend your legs more"
3. Ben tries to copy, but coach is 6' and Ben is 5'6"
4. Ben's form looks different, but he can't tell if it's because of body size or technique
5. Coach can't easily show exactly how much to bend
6. Ben gets frustrated

**New Workflow** (with Pose Overlay Viewer):
1. Ben uploads his backside 360 attempt
2. Coach uploads his perfect backside 360
3. Ben opens Pose Overlay Viewer
4. Sees his skeleton (blue) overlaid on coach's skeleton (orange, scaled to Ben's height)
5. Coach says "see how my legs are more bent here?" and points to the overlay
6. Ben can see the exact angle difference
7. Ben adjusts form and tries again
8. Overlay shows improvement
9. Ben learns faster, coach gives better feedback

**Result**: Ben learns the trick 2-3x faster because feedback is visual and precise.

---

## Appendix: Technical Debt & Future Work

### Phase 5: Advanced Features (Future)

- [ ] Numeric deltas overlay ("15° less knee extension")
- [ ] Velocity vectors (show speed of movement)
- [ ] Acceleration visualization
- [ ] Symmetry analysis (left vs right)
- [ ] Heatmaps showing deviation areas
- [ ] Export comparison as video
- [ ] Multi-person comparison (compare to 3+ skeletons)
- [ ] Skeleton animation export (for coaching videos)

### Performance Optimization (Future)

- [ ] Level-of-detail (LOD) for distant skeletons
- [ ] Frame culling (skip frames far from current time)
- [ ] WebGL shader optimization
- [ ] Skeleton simplification (reduce joint count)
- [ ] Streaming large skeleton sequences

### Cross-Platform (Future)

- [ ] Web version (React + Three.js)
- [ ] Desktop app (Electron)
- [ ] VR version (WebXR)
- [ ] AR version (show overlay on live video)
