# Implementation Plan: Pose Service Docker Dependencies Fix

## Overview

This plan provides a step-by-step approach to fix all Docker dependencies for the pose service. The goal is to create a corrected Dockerfile and requirements.txt that eliminates all identified errors before rebuilding the Docker image (which takes ~1 hour).

## Tasks

- [x] 1. Create corrected requirements.txt with all dependencies
  - Remove non-existent packages (libtiff6 → libtiff5)
  - Add missing packages (detectron2, smpl-x, phalp, timm)
  - Verify all package names exist in PyPI
  - Ensure version compatibility
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 2. Create corrected Dockerfile with proper system dependencies
  - Fix graphics libraries (libgl1-mesa-glx, libgl1-mesa-dev)
  - Fix image processing libraries (use libtiff5 instead of libtiff6)
  - Add all build tools and development headers
  - Organize dependencies into logical stages
  - _Requirements: 1.1, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 3. Add 4D-Humans installation to Dockerfile
  - Clone 4D-Humans from GitHub
  - Copy to /app/4D-Humans
  - Ensure SMPL models are accessible
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 4. Add Detectron2 installation to Dockerfile
  - Clone Detectron2 from GitHub
  - Build from source with pip install -e .
  - Verify installation succeeds
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Verify Dockerfile syntax and structure
  - Check for syntax errors
  - Verify all COPY commands reference correct paths
  - Ensure RUN commands use proper shell syntax
  - Verify EXPOSE and CMD are correct
  - _Requirements: 6.1_

- [x] 6. Create test script to verify all dependencies in container
  - Test libGL.so.1 availability
  - Test image decoding with sample base64 image
  - Test all module imports (4D-Humans, PHALP, ViTPose, Detectron2)
  - Test Flask startup
  - Use Docker MCP to inspect container filesystem if needed
  - _Requirements: 1.2, 3.2, 4.2, 5.2, 7.2, 8.1_

- [x] 7. Build Docker image and verify no errors
  - Run: `docker-compose -f SnowboardingExplained/docker-compose.yml build pose-service`
  - Monitor build output for errors using Docker MCP logs
  - Verify build completes successfully
  - If build fails, use Docker MCP to inspect build logs and identify missing packages
  - Iterate on Dockerfile/requirements.txt until build succeeds
  - _Requirements: 6.1, 7.1_

- [ ] 8. Start pose service container and verify startup
  - Run: `docker-compose -f SnowboardingExplained/docker-compose.yml up pose-service`
  - Use Docker MCP to monitor container logs in real-time
  - Check logs for startup errors (libGL, import errors, etc.)
  - Verify Flask application starts without errors
  - Verify health check passes (should see health check success in logs)
  - If startup fails, use Docker MCP to inspect container and debug
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 9. Test image decoding with sample frame
  - Use Browser MCP to navigate to frontend at http://localhost:5173
  - Use Chrome DevTools to inspect network requests to /pose/hybrid endpoint
  - Send test base64 image to /pose/hybrid endpoint
  - Verify response is HTTP 200 (not 400) using Chrome DevTools Network tab
  - Verify response contains pose data (not error message) using Chrome DevTools
  - Use Docker MCP to check pose service logs for "libGL.so.1" errors
  - If errors occur, iterate on Dockerfile and rebuild
  - _Requirements: 1.2, 8.1, 8.2, 8.3_

- [ ] 10. Test full video upload pipeline
  - Use Browser MCP to navigate to frontend at http://localhost:5173
  - Upload test video via frontend UI
  - Use Chrome DevTools to monitor network requests and responses
  - Use Docker MCP to monitor pose service logs for frame processing
  - Verify all frames process without libGL errors in Docker logs
  - Use Browser MCP to check if mesh data appears in frontend
  - Query MongoDB to verify mesh data is saved for all frames
  - Verify frontend receives valid responses (HTTP 200) using Chrome DevTools
  - If any errors occur, use Docker MCP to inspect pose service logs and iterate
  - _Requirements: 1.2, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 11. Final verification and iteration
  - Use Docker MCP to collect all pose service logs
  - Search logs for all error messages from requirements (libGL.so.1, import errors, etc.)
  - Use Chrome DevTools to verify all API responses are HTTP 200
  - Use Browser MCP to verify frontend displays mesh data correctly
  - If any errors found, identify root cause using Docker MCP logs
  - Update Dockerfile/requirements.txt as needed
  - Rebuild Docker image and re-test
  - Repeat until all success criteria are met
  - _Requirements: All_

- [ ] 12. Verify all success criteria are met
  - ✅ No "libGL.so.1: cannot open shared object file" errors in Docker logs
  - ✅ All frames process successfully (no HTTP 400 errors in Chrome DevTools)
  - ✅ Mesh data saved to MongoDB for all frames (verify via MongoDB query)
  - ✅ Docker build completes without errors
  - ✅ All Python modules import successfully (check Docker logs at startup)
  - ✅ SMPL model loading completes without warnings (check Docker logs)
  - ✅ Frontend receives valid pose data responses (verify via Chrome DevTools)
  - Use Docker MCP to generate final log report
  - Use Browser MCP to verify frontend functionality end-to-end
  - Document any issues found and fixes applied
  - _Requirements: All_

## Notes

- The Docker image build takes approximately 1 hour, so all fixes must be correct before building
- Use the test script (Task 6) to verify dependencies before building the full image
- Monitor build output carefully for any package not found errors
- If build fails, fix the issue and rebuild (don't attempt to patch a running container)
- All error messages from the requirements must be eliminated

