# Mesh Caching Root Cause Analysis

Frame extraction cache was using only first 8 characters of videoId, causing collisions.

**Problem:**
- `v_1766516045056_1` and `v_1766516091051_2` both mapped to `v_176651`
- Second video displayed first video's mesh

**Solution:**
- Use full videoId for unique cache directories
- Implement three-layer verification in meshDataService

See STALE_MESH_ROOT_CAUSE_FIXED.md for implementation details.
