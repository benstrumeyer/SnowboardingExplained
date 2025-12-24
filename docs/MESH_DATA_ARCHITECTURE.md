# Mesh Data Architecture

Three-layer verification system for mesh data integrity.

**Layers:**
1. **Deletion Verification** - Confirms old frames deleted before insertion
2. **Insertion Verification** - Confirms all new frames saved with correct videoId
3. **Retrieval Verification** - Confirms retrieved frames have correct videoId

**Collections:**
- `mesh_data` - Video metadata (fps, duration, frame count)
- `mesh_frames` - Individual frame data (keypoints, mesh vertices)

See backend/src/services/meshDataService.ts for implementation.
