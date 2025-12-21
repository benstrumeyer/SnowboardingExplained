# Pose Overlay Viewer - Specification Index

## Overview

Complete specification for the Pose Overlay Viewer web application - a 3D pose comparison tool for snowboarders.

---

## Core Documents

### 1. **README.md**
Quick start guide for developers. Start here.

### 2. **SPEC.md**
Complete product specification including:
- Problem statement
- Solution overview
- Feature set (6 major features)
- Technical architecture
- Implementation plan (4 phases)
- Success criteria

### 3. **ARCHITECTURE.md**
Technical architecture including:
- Component hierarchy
- State management
- Component specifications
- Playback logic
- Services and hooks
- UI layout
- File structure

### 4. **design.md**
Detailed component design including:
- High-level flow
- Component architecture
- Components & interfaces
- Data models
- Correctness properties
- Error handling
- Testing strategy

### 5. **PROJECT_STRUCTURE.md**
Project layout and organization:
- Where the web app lives
- Why it's separate from mobile app
- Shared resources with backend
- Deployment strategy
- File structure
- Dependencies
- Environment variables

### 6. **tasks.md**
Implementation task list with 38 tasks across 4 phases:
- Phase 1: MVP (2 weeks, 19 tasks)
- Phase 2: Enhanced Features (1 week, 6 tasks)
- Phase 3: Body Proportion Scaling (1 week, 5 tasks)
- Phase 4: Polish & Optimization (1 week, 8 tasks)
- Testing strategy
- Success criteria
- Timeline

---

## Key Features

### 1. Dual Rendering Modes
- Side-by-side: Rider on left, reference on right
- Overlay: Both in same 3D space, reference semi-transparent

### 2. Synchronized Playback with Frame Offsets
- Both meshes play at same speed simultaneously
- Each mesh has independent frame offset slider (±N frames)
- Users adjust offsets to perfectly align key moments

### 3. Camera Freedom
- Full 360° rotation
- Zoom in/out
- Pan left/right/up/down
- Reset to default view

### 4. In-Place Motion Mode
- Remove global translation
- See pure rotation and joint movement
- Useful for spins and aerial tricks

### 5. Interactive Controls
- Play/pause/scrub
- Speed control (0.5x, 1x, 2x)
- Frame-by-frame navigation
- Show/hide toggles
- Opacity control

### 6. Body Proportion Scaling
- Scale reference mesh to match rider's height
- Automatically computed from body proportions
- Visual feedback showing scale factor

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 | Component-based UI |
| 3D Graphics | Three.js | Mature, performant 3D rendering |
| Language | TypeScript | Type safety |
| Build Tool | Vite | Fast builds, HMR |
| Testing | Jest + RTL | Standard testing |
| Deployment | Vercel/Netlify | Easy deployment |
| Backend | Existing Node.js API | Shared with mobile |
| Database | Existing PostgreSQL | Shared with mobile |

---

## Architecture Overview

```
App
└── PoseOverlayViewer
    ├── ThreeJsScene
    │   ├── MeshRenderer (rider)
    │   ├── MeshRenderer (reference)
    │   └── Camera controller
    ├── PlaybackControls (global)
    ├── MeshControls (rider)
    ├── MeshControls (reference)
    ├── VisibilityToggle
    └── CameraControls
```

---

## Implementation Timeline

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| Phase 1: MVP | 2 weeks | 19 | Not started |
| Phase 2: Enhanced | 1 week | 6 | Not started |
| Phase 3: Scaling | 1 week | 5 | Not started |
| Phase 4: Polish | 1 week | 8 | Not started |
| **Total** | **5 weeks** | **38** | **Not started** |

---

## Success Criteria

### MVP Success
- Load two mesh sequences
- Render side-by-side in Three.js
- Synchronized playback with frame offsets
- Play/pause/scrub controls work
- Per-mesh frame offset controls work
- Camera rotation works
- 60fps on desktop, 30-60fps on mobile
- Mobile responsive

### Full Feature Success
- Overlay mode works correctly
- In-place mode removes translation properly
- Body proportion scaling is accurate
- All controls are intuitive
- Documentation is complete
- Coaches validate usefulness

---

## File Structure

```
.kiro/specs/pose-overlay-viewer/
├── README.md                (Quick start)
├── SPEC.md                  (Product spec)
├── ARCHITECTURE.md          (Technical architecture)
├── design.md                (Component design)
├── PROJECT_STRUCTURE.md     (Project layout)
├── tasks.md                 (Implementation tasks)
└── INDEX.md                 (This file)
```

---

## Next Steps

1. Read README.md for quick start
2. Read SPEC.md to understand requirements
3. Read ARCHITECTURE.md to understand system design
4. Read design.md for component details
5. Read tasks.md to see implementation plan
6. Begin Phase 1 implementation

---

## Status

✅ Specification complete
✅ Architecture finalized
✅ Tasks defined
✅ Ready for implementation

