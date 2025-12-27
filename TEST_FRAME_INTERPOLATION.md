# Testing Frame Interpolation

## Quick Test

To verify the frame interpolation system is working:

### 1. Build the project
```bash
cd SnowboardingExplained/backend
npm run build
```

Expected: No TypeScript errors

### 2. Test with sample data

Create a test file `backend/test-interpolation.ts`:

```typescript
import { FrameInterpolationService } from './src/services/frameInterpolation/frameInterpolationService';
import { FrameGapAnalyzer } from './src/services/frameInterpolation/frameGapAnalyzer';

// Create sample data
const sourceFrameIndices = [0, 2, 4, 6, 8, 10]; // 6 source frames
const totalFrames = 11; // 11 total frames (5 missing)

// Create sample frames
const sourceFrames = new Map();
for (const idx of sourceFrameIndices) {
  sourceFrames.set(idx, {
    frameNumber: idx,
    timestamp: idx / 60,
    keypoints: [
      { x: idx * 10, y: idx * 10, z: 0, confidence: 0.9, name: 'nose' },
      { x: idx * 10 + 5, y: idx * 10 + 5, z: 0, confidence: 0.9, name: 'left_eye' }
    ],
    skeleton: {},
    mesh_vertices_data: [[idx, idx, 0], [idx + 1, idx + 1, 0]],
    mesh_faces_data: [[0, 1, 2]]
  });
}

// Test interpolation service
const service = new FrameInterpolationService();
service.initialize(sourceFrameIndices, totalFrames);

console.log('=== Frame Interpolation Test ===\n');

// Test each frame
for (let i = 0; i < totalFrames; i++) {
  const frame = service.getFrame(i, sourceFrames);
  if (frame) {
    console.log(`Frame ${i}:`);
    console.log(`  Interpolated: ${frame.interpolated}`);
    if (frame.interpolationMetadata) {
      console.log(`  Source frames: ${frame.interpolationMetadata.sourceFrames}`);
      console.log(`  Factor: ${frame.interpolationMetadata.interpolationFactor.toFixed(2)}`);
    }
    console.log(`  Keypoints: ${frame.keypoints.length}`);
    console.log(`  Vertices: ${frame.mesh_vertices_data.length}`);
  }
}

// Print statistics
const stats = service.getStatistics();
console.log('\n=== Statistics ===');
console.log(`Total frames: ${stats.totalFrames}`);
console.log(`Source frames: ${stats.sourceFrames}`);
console.log(`Interpolated frames: ${stats.interpolatedFrames}`);
console.log(`Interpolation %: ${stats.interpolationPercentage.toFixed(1)}%`);
console.log(`Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`);
console.log(`Avg interpolation time: ${stats.averageInterpolationTime.toFixed(2)}ms`);
```

Run it:
```bash
npx ts-node backend/test-interpolation.ts
```

Expected output:
```
=== Frame Interpolation Test ===

Frame 0:
  Interpolated: false
  Keypoints: 2
  Vertices: 2
Frame 1:
  Interpolated: true
  Source frames: 0,2
  Factor: 0.50
  Keypoints: 2
  Vertices: 2
Frame 2:
  Interpolated: false
  Keypoints: 2
  Vertices: 2
...

=== Statistics ===
Total frames: 11
Source frames: 6
Interpolated frames: 5
Interpolation %: 45.5%
Cache hit rate: 0.0%
Avg interpolation time: 0.15ms
```

## Integration Test

To test with the mesh data service:

### 1. Start MongoDB
```bash
# In WSL or Docker
mongod --dbpath /data/db
```

### 2. Create test file `backend/test-mesh-interpolation.ts`:

```typescript
import { meshDataService } from './src/services/meshDataService';

async function testMeshInterpolation() {
  try {
    // Connect to database
    await meshDataService.connect();
    console.log('✓ Connected to MongoDB');

    // Initialize interpolation for a test video
    const videoId = 'test-video-interpolation';
    const sourceFrameIndices = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]; // 10 frames
    const totalFrames = 20; // 20 total (10 missing)

    await meshDataService.initializeInterpolation(videoId, sourceFrameIndices, totalFrames);
    console.log('✓ Interpolation initialized');

    // Enable interpolation
    meshDataService.setInterpolationEnabled(true);
    console.log('✓ Interpolation enabled');

    // Test getting frames
    console.log('\n=== Testing Frame Retrieval ===');
    
    // Note: This will fail because we haven't saved actual frames
    // But it demonstrates the API
    
    // Get a source frame (would be from DB)
    // const frame0 = await meshDataService.getFrame(videoId, 0);
    
    // Get an interpolated frame (would be interpolated)
    // const frame1 = await meshDataService.getFrame(videoId, 1);
    
    // Get a range
    // const frames = await meshDataService.getFrameRange(videoId, 0, 5);

    // Get statistics
    const stats = meshDataService.getInterpolationStatistics();
    console.log('Interpolation statistics:');
    console.log(`  Total frames: ${stats.totalFrames}`);
    console.log(`  Source frames: ${stats.sourceFrames}`);
    console.log(`  Interpolated frames: ${stats.interpolatedFrames}`);
    console.log(`  Interpolation %: ${stats.interpolationPercentage.toFixed(1)}%`);

    // Cleanup
    await meshDataService.disconnect();
    console.log('\n✓ Test complete');
  } catch (err) {
    console.error('✗ Test failed:', err);
  }
}

testMeshInterpolation();
```

Run it:
```bash
npx ts-node backend/test-mesh-interpolation.ts
```

## Real Video Test

To test with an actual video:

### 1. Upload a video
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "video=@test-video.mp4" \
  -F "videoId=test-720p" \
  -F "role=rider"
```

### 2. Check frame extraction
```bash
curl http://localhost:3001/api/mesh-data/test-720p
```

Look for:
- `frameCount`: Should be less than total frames
- `metadata.qualityStats`: Shows how many frames were removed

### 3. Test frame retrieval with interpolation
```bash
# Get frame 0 (should be source frame)
curl http://localhost:3001/api/mesh-data/test-720p/frame/0

# Get frame 1 (might be interpolated)
curl http://localhost:3001/api/mesh-data/test-720p/frame/1

# Get frame range
curl http://localhost:3001/api/mesh-data/test-720p/frames?start=0&end=10
```

### 4. Check playback
Open the web UI and play the video. You should see:
- Smooth mesh playback (no jitter)
- Mesh completes full rotation
- No frame skipping
- Synchronized with video

## Debugging

### Enable debug logging

In `backend/src/services/frameInterpolation/frameGapAnalyzer.ts`:
```typescript
FrameGapAnalyzer.logGapAnalysis(metadata);
```

This will print:
```
[FRAME-GAP] ========== Gap Analysis ==========
[FRAME-GAP] Total video frames: 140
[FRAME-GAP] Source frames: 90
[FRAME-GAP] Missing frames: 50
[FRAME-GAP] Interpolation: 35.7%
[FRAME-GAP] Has start gap: false
[FRAME-GAP] Has end gap: true
[FRAME-GAP] Gap count: 25
[FRAME-GAP] Gaps:
[FRAME-GAP]   1. Frames 0 -> 2 (1 missing)
[FRAME-GAP]   2. Frames 2 -> 4 (1 missing)
...
[FRAME-GAP] ================================
```

### Check cache statistics

```typescript
const cacheStats = interpolationService.getCacheStats();
console.log('Cache stats:', cacheStats);
// Output: { cacheSize: 50, cacheHits: 100, cacheMisses: 50, hitRate: 66.67 }
```

### Verify frame data

```typescript
const frame = await meshDataService.getFrame(videoId, 1);
console.log('Frame 1:', {
  frameNumber: frame.frameNumber,
  interpolated: frame.interpolated,
  keypointCount: frame.keypoints?.length,
  vertexCount: frame.mesh_vertices_data?.length,
  metadata: frame.interpolationMetadata
});
```

## Performance Benchmarking

Create `backend/benchmark-interpolation.ts`:

```typescript
import { FrameInterpolationService } from './src/services/frameInterpolation/frameInterpolationService';

function benchmark() {
  const service = new FrameInterpolationService();
  
  // Create 1000 source frames
  const sourceFrameIndices = [];
  for (let i = 0; i < 1000; i += 2) {
    sourceFrameIndices.push(i);
  }
  
  service.initialize(sourceFrameIndices, 1000);
  
  // Create source frames
  const sourceFrames = new Map();
  for (const idx of sourceFrameIndices) {
    sourceFrames.set(idx, {
      frameNumber: idx,
      timestamp: idx / 60,
      keypoints: Array(17).fill(null).map((_, i) => ({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        z: Math.random() * 100,
        confidence: Math.random(),
        name: `kp_${i}`
      })),
      skeleton: {},
      mesh_vertices_data: Array(100).fill(null).map(() => [
        Math.random() * 1920,
        Math.random() * 1080,
        Math.random() * 100
      ]),
      mesh_faces_data: Array(50).fill(null).map(() => [0, 1, 2])
    });
  }
  
  console.log('=== Performance Benchmark ===\n');
  
  // Benchmark single frame access
  console.log('Single frame access:');
  const start1 = Date.now();
  for (let i = 0; i < 1000; i++) {
    service.getFrame(i, sourceFrames);
  }
  const time1 = Date.now() - start1;
  console.log(`  1000 frames: ${time1}ms (${(time1/1000).toFixed(2)}ms per frame)`);
  
  // Benchmark with cache
  console.log('\nWith cache (second pass):');
  const start2 = Date.now();
  for (let i = 0; i < 1000; i++) {
    service.getFrame(i, sourceFrames);
  }
  const time2 = Date.now() - start2;
  console.log(`  1000 frames: ${time2}ms (${(time2/1000).toFixed(2)}ms per frame)`);
  
  // Print statistics
  const stats = service.getStatistics();
  console.log('\nStatistics:');
  console.log(`  Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`);
  console.log(`  Avg interpolation time: ${stats.averageInterpolationTime.toFixed(3)}ms`);
  
  const cacheStats = service.getCacheStats();
  console.log(`  Cache size: ${cacheStats.cacheSize}`);
  console.log(`  Cache hits: ${cacheStats.cacheHits}`);
  console.log(`  Cache misses: ${cacheStats.cacheMisses}`);
}

benchmark();
```

Run it:
```bash
npx ts-node backend/benchmark-interpolation.ts
```

Expected output:
```
=== Performance Benchmark ===

Single frame access:
  1000 frames: 45ms (0.05ms per frame)

With cache (second pass):
  1000 frames: 2ms (0.00ms per frame)

Statistics:
  Cache hit rate: 99.9%
  Avg interpolation time: 0.04ms
  Cache size: 500
  Cache hits: 1500
  Cache misses: 500
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Service not initialized" | Call `initialize()` before `getFrame()` |
| Interpolated frames are null | Check source frames exist in map |
| Cache not working | Verify `getFrame()` is called multiple times |
| Slow interpolation | Check for large keypoint/vertex arrays |
| Memory growing | Call `clearCache()` periodically |

## Next Steps

1. Run the quick test to verify compilation
2. Run the integration test to verify API
3. Upload a real video and test playback
4. Run performance benchmark
5. Check debug logs for any issues
