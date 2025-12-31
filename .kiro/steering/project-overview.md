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
- **3D Visualization** - Three.js rendering of skeleton/mesh
- **Data Storage** - MongoDB for results

## Tech Stack

- **Backend:** Node.js/Express (port 3001)
- **Pose Service:** Python/Flask (port 5000)
- **ML Models:** 4D-Humans, PHALP, ViTDet, detectron2
- **Frontend:** Three.js (web-based)
- **Database:** MongoDB

## Current Status

- ✅ Backend running locally
- ✅ Pose service framework ready
- ⏳ Dependencies being configured (frozen stack)
- ⏳ Integration testing

## Next Steps

1. Install frozen ML dependencies in correct order
2. Test full video processing pipeline
3. Verify PHALP temporal tracking
4. Build Three.js visualization
5. Implement database storage

## Important Notes

- **No Mobile for MVP** - Focus on web-based upload and visualization
- **Full Video Processing** - Videos processed as a unit (not frame-by-frame)
- **Frozen Dependencies** - All ML packages cloned locally, must install in order
- **Local Development** - Running in WSL2 with Kiro IDE

## Quick Links

- Architecture: `.kiro/steering/architecture.md`
- Setup: `.kiro/steering/dependency-setup.md`
- Development: `.kiro/steering/development-guide.md`
- WSL: `.kiro/steering/wsl-integration.md`
