# Project Overview

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## What is SnowboardingExplained?

A video analysis platform that extracts 3D pose data from snowboarding videos using AI, enabling motion capture visualization and analysis.

## MVP Goal

Process snowboarding videos to extract accurate 3D pose data with temporal consistency, visualize in 3D, and store for future analysis.

## Key Features

- **Video Upload** - Web-based video upload modal
- **3D Pose Extraction** - 4D-Humans model for per-frame pose
- **Temporal Tracking** - PHALP for motion consistency
- **3D Visualization** - Three.js rendering of 3D mesh (right panel)
- **Side-by-Side View** - Left: toggle original/overlay videos, Right: Three.js mesh
- **Frame-by-Frame Display** - Navigate videos frame-by-frame with sync
- **Data Storage** - MongoDB for results (mesh data + videos)

## Tech Stack

- **Backend:** Node.js/Express (port 3001)
- **Pose Service:** Python/Flask (port 5000)
- **ML Models:** 4D-Humans, PHALP, ViTDet, detectron2
- **Frontend:** Three.js (web-based)
- **Database:** MongoDB

## Current Status

- ✅ Backend running locally
- ✅ Pose service framework ready
- ✅ PlaybackEngine source-of-truth architecture implemented
- ✅ NativeScrubber with 60fps tracking
- ✅ Geometry reuse pattern for smooth mesh animation
- ✅ Loop boundary detection for seamless playback
- ⏳ Dependencies being configured (frozen stack)
- ⏳ Integration testing

## Next Steps

1. Install frozen ML dependencies in correct order
2. Extract mesh data from PHALP pickle output
3. Save original and overlay videos to MongoDB
4. Test end-to-end pipeline with real video data
5. Optimize performance for larger videos
6. Add advanced playback features (frame-by-frame, reverse, speed control)

## Important Notes

- **No Mobile for MVP** - Focus on web-based upload and visualization
- **Full Video Processing** - Videos processed as a unit (not frame-by-frame)
- **Frozen Dependencies** - All ML packages cloned locally, must install in order
- **Local Development** - Running in WSL2 with Kiro IDE
- **PlaybackEngine as Source of Truth** - Single RAF loop drives all rendering
- **Geometry Reuse** - Pre-create Three.js geometry once, update vertices per frame
- **Event-Based Sync** - All components listen to engine events, never own clocks
- **Native Scrubber** - 60fps DOM-based scrubber without React overhead
- **Three.js Essential** - 3D mesh visualization is the core value proposition
- **Perfect Frame Sync** - Mesh, video, and scrubber all follow engine time

## Quick Links

- Architecture: `.kiro/steering/architecture.md`
- Setup: `.kiro/steering/dependency-setup.md`
- Development: `.kiro/steering/development-guide.md`
- WSL: `.kiro/steering/wsl-integration.md`
