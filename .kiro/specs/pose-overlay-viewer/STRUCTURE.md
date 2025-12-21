# Pose Overlay Viewer - Complete Specification Structure

## Overview

All snowboarding coaching platform specifications are now organized under the Pose Overlay Viewer umbrella, grouped by feature area.

## Directory Structure

```
.kiro/specs/pose-overlay-viewer/
├── Core Pose Overlay Viewer Specs
│   ├── README.md                    # Quick start guide
│   ├── SPEC.md                      # Complete product specification
│   ├── ARCHITECTURE.md              # Technical architecture
│   ├── design.md                    # Component design details
│   ├── PROJECT_STRUCTURE.md         # Project layout and organization
│   ├── tasks.md                     # 38 implementation tasks (4 phases)
│   ├── INDEX.md                     # Specification index
│   └── STRUCTURE.md                 # This file
│
├── comparison-mode-signals/         # Comparison Mode Signals Feature
│   ├── README.md                    # Feature overview
│   ├── INDEX.md                     # Navigation guide
│   ├── requirements.md              # Feature requirements
│   ├── SUMMARY.md                   # Implementation summary
│   ├── QUICK_REFERENCE.md           # Quick reference guide
│   ├── IMPLEMENTATION_COMPLETE.md   # Implementation status
│   ├── IMPLEMENTATION_READY.md      # Ready for implementation
│   ├── BACKEND_MAPPING.md           # Backend API mapping
│   ├── COACHING_LANGUAGE_TO_SIGNALS.md  # Signal definitions
│   ├── SIGNAL_BRAINSTORM.md         # Signal brainstorming
│   ├── PINECONE_ANALYSIS.md         # Vector database analysis
│   ├── REFERENCE_LIBRARY_GUIDE.md   # Reference library system
│   ├── REFERENCE_LIBRARY_QUICKSTART.md  # Quick start guide
│   ├── STACKED_POSITION_GUIDE.md    # Stacked position analysis
│   ├── TESTING_GUIDE.md             # Testing strategy
│   ├── CHATGPT_SUMMARY.md           # ChatGPT analysis summary
│   └── QUICK_REFERENCE.md           # Quick reference
│
└── temporal-signal-sequences/       # Temporal Signal Sequences Feature
    ├── requirements.md              # Feature requirements (APPROVED)
    ├── QUICK_START.md               # Quick start guide
    ├── SPEC_SUMMARY.md              # Specification summary
    ├── design.md                    # Component design
    ├── database-schema.md           # Database schema design
    ├── llm-prompt-design.md         # LLM prompt engineering
    └── tasks.md                     # Implementation tasks
```

## Feature Areas

### 1. Pose Overlay Viewer (Core)
**Status**: ✅ Complete and Ready for Implementation

The main 3D pose comparison tool that lets riders compare their movement against coaches/pros by viewing two 3D mesh models side-by-side or overlaid.

**Key Features**:
- Dual rendering modes (side-by-side and overlay)
- Synchronized playback with individual frame offset controls
- Per-mesh rotation adjustment (X, Y, Z axes)
- Camera freedom (rotate, zoom, pan)
- In-place motion mode
- Interactive controls
- Body proportion scaling

**Timeline**: 5 weeks (38 tasks across 4 phases)
- Phase 1: MVP (2 weeks)
- Phase 2: Enhanced Features (1 week)
- Phase 3: Body Proportion Scaling (1 week)
- Phase 4: Polish & Optimization (1 week)

### 2. Comparison Mode Signals
**Status**: ✅ Complete and Implemented

Infrastructure for comparing rider signals against coach signals to provide coaching feedback.

**Key Components**:
- Phase normalization (normalize to [0,1] time)
- Delta computation (compare signals)
- Coaching archetype detection (9 archetypes)
- Reference library system (store coach videos with extracted signals)
- Stacked position analysis (extract body metrics)
- API endpoints for comparison and reference management

**Implementation**: Complete with 6 utilities, 3 API endpoints, and mobile UI

### 3. Temporal Signal Sequences
**Status**: ✅ Requirements Approved, Ready for Design

Database for capturing movement patterns over multiple frames (not static poses).

**Key Concept**: 
- Extract complete pose mathematics (position, velocity, acceleration, jerk) for EVERY body part
- Store as "north star" reference for perfect execution
- Compare rider attempts to perfect reference
- Provide specific feedback like "arm snap is 15°/frame too slow"

**Requirements Approved**:
1. Frame range selection UI
2. Signal sequence definition
3. Complete body part temporal analysis
4. Curve comparison metrics
5. LLM-assisted signal analysis
6. Perfect pose database
7. Rider to perfect comparison
8. Body part movement analysis
9. Body proportion normalization

## How They Work Together

```
Pose Overlay Viewer (Visual Feedback)
    ↓
    Provides 3D mesh comparison for riders to see form differences
    
    ↓
    
Comparison Mode Signals (Numerical Feedback)
    ↓
    Extracts signals from coach videos and compares to rider
    Provides coaching feedback based on signal deltas
    
    ↓
    
Temporal Signal Sequences (Detailed Analysis)
    ↓
    Captures movement patterns over time
    Provides frame-by-frame feedback on specific body parts
    
    ↓
    
Complete Coaching System
    ↓
    Rider sees visual comparison (overlay viewer)
    Rider gets numerical feedback (comparison signals)
    Rider gets detailed frame-by-frame analysis (temporal sequences)
```

## Next Steps

### Immediate (Ready Now)
- Start Phase 1 implementation of Pose Overlay Viewer
- Build React + Three.js web app with Vite
- Implement mesh rendering and synchronized playback

### Short Term (After MVP)
- Get coach feedback on Pose Overlay Viewer
- Iterate based on feedback
- Begin Phase 2 enhancements

### Medium Term (After Phase 2)
- Start design phase for Temporal Signal Sequences
- Build database schema for temporal data
- Implement LLM-assisted signal analysis

### Long Term
- Integrate all three features into complete coaching platform
- Deploy to production
- Gather user feedback and iterate

## File Organization Rationale

All specs are organized under `pose-overlay-viewer/` because:

1. **Pose Overlay Viewer is the core feature** - the main user-facing tool
2. **Comparison Mode Signals enhances it** - provides numerical feedback alongside visual
3. **Temporal Signal Sequences extends it** - provides detailed frame-by-frame analysis
4. **They work together** - form a complete coaching system
5. **Easier navigation** - all related specs in one place
6. **Clear hierarchy** - main feature with supporting features

## Status Summary

| Feature | Status | Phase |
|---------|--------|-------|
| Pose Overlay Viewer | Complete Spec | Ready for Implementation |
| Comparison Mode Signals | Complete & Implemented | Production |
| Temporal Signal Sequences | Requirements Approved | Ready for Design |

---

**Last Updated**: December 21, 2025
**Total Specs**: 38 files organized in 3 feature areas
**Ready for Implementation**: Yes
