# Parallelization Strategy - Pose Detection vs Mesh Rendering

## The Reality

HMR2 is **GPU-intensive and memory-hungry**. Loading multiple instances in parallel doesn't work well:

- Each HMR2 model: ~2-3GB GPU memory
- 4 workers × 3GB = 12GB GPU memory (most GPUs don't have this)
- Parallel loading causes CUDA conflicts and OOM errors
- Inference is already fast enough per-frame (~100-300ms)

**The real bottleneck is mesh rendering**, which was sequential with a global lock.

---

## Two-Tier Parallelization

### Tier 1: Pose Detection (2 Workers)
```
Frame 0 → Worker 0 (HMR2) → Pose data
Frame 1 → Worker 1 (HMR2) → Pose data
Frame 2 → Worker 0 (HMR2) → Pose data
Frame 3 → Worker 1 (HMR2) → Pose data
...
```

**Why 2 workers?**
- Keeps GPU memory reasonable (~6GB)
- Avoids CUDA conflicts
- Still gives 2x throughput vs single worker
- Frames queue up and process smoothly

**Performance:**
- Single worker: 150-300ms/frame
- 2 workers: 75-150ms/frame effective throughput

### Tier 2: Mesh Rendering (4 Workers)
```
Pose data for frames 0-3
    ↓
Process pool with 4 workers
    ├─ Worker 0: Frame 0 (200ms)
    ├─ Worker 1: Frame 1 (200ms)
    ├─ Worker 2: Frame 2 (200ms)
    └─ Worker 3: Frame 3 (200ms)
    ↓
All 4 frames rendered in parallel (200ms total, not 800ms)
```

**Why 4 workers for mesh rendering?**
- Mesh rendering uses CPU + OpenGL (not GPU memory)
- Each worker gets independent OpenGL context
- No CUDA conflicts
- 4x speedup on mesh rendering

**Performance:**
- Sequential: 200ms × 300 frames = 60 seconds
- Parallel (4 workers): 200ms × (300/4) = 15 seconds (4x faster)

---

## Pipeline Flow

```
Video Input
    ↓
Frame Extraction
    ↓
┌─────────────────────────────────────┐
│ Pose Detection (2 HMR2 workers)     │
│ ├─ Worker 0: Frame 0, 2, 4, ...    │
│ └─ Worker 1: Frame 1, 3, 5, ...    │
│ Result: Pose data for all frames   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Mesh Rendering (4 pyrender workers) │
│ ├─ Worker 0: Frame 0 (parallel)    │
│ ├─ Worker 1: Frame 1 (parallel)    │
│ ├─ Worker 2: Frame 2 (parallel)    │
│ └─ Worker 3: Frame 3 (parallel)    │
│ Result: Rendered frames with mesh  │
└─────────────────────────────────────┘
    ↓
Video Assembly
    ↓
Output Video
```

---

## Configuration

### Pose Detection Workers
```python
# In parallel_video_processor.py
processor = ParallelVideoProcessor(
    num_workers=2,      # HMR2 is heavy, keep at 2
    batch_size=8,       # For progress reporting
    focal_length=5000.0
)
```

**Don't increase this.** HMR2 will OOM or cause CUDA errors.

### Mesh Rendering Workers
```python
# In batch_mesh_renderer.py
renderer = BatchMeshRenderer(
    num_workers=4,      # Can be 4-8 depending on CPU cores
    batch_size=8,
    focal_length=5000.0
)
```

**Can increase to 8** if you have 8+ CPU cores and want faster mesh rendering.

---

## Performance Expectations

### 300-frame video

| Stage | Sequential | Parallel | Speedup |
|-------|-----------|----------|---------|
| Pose Detection | 45s (300 × 150ms) | 22.5s (2 workers) | 2x |
| Mesh Rendering | 60s (300 × 200ms) | 15s (4 workers) | 4x |
| **Total** | **105s** | **37.5s** | **2.8x** |

### Bottleneck Analysis
- Pose detection: 60% of time (HMR2 is slow)
- Mesh rendering: 40% of time (but parallelized 4x)
- Overall: 2.8x faster than sequential

---

## Why This Works

### Pose Detection (2 workers)
- ✓ Avoids GPU memory issues
- ✓ Avoids CUDA conflicts
- ✓ Still gives 2x throughput
- ✓ Frames queue smoothly

### Mesh Rendering (4 workers)
- ✓ Each worker has independent OpenGL context
- ✓ No GPU memory pressure (CPU + OpenGL)
- ✓ True parallelization (no global lock)
- ✓ 4x speedup on mesh rendering

### Combined
- ✓ Pose detection feeds mesh rendering
- ✓ Mesh rendering doesn't block pose detection
- ✓ Overall 2.8x faster than sequential
- ✓ Stable and reliable

---

## Logging

Monitor the pipeline:

```
[POOL] Initialized with 2 workers (HMR2 is GPU-intensive, 2 recommended)
[WORKER-0] Starting worker process (PID: 1234)
[WORKER-0] Loading HMR2 model (this takes ~10-30s)...
[WORKER-0] ✓ Model loaded successfully
[WORKER-1] Starting worker process (PID: 1235)
[WORKER-1] Loading HMR2 model (this takes ~10-30s)...
[WORKER-1] ✓ Model loaded successfully
[POOL] All 2 workers started

[BATCH_RENDERER] Starting parallel rendering: 300 frames with 4 workers
[BATCH_RENDERER] Process pool created with 4 workers
[BATCH_RENDERER] Progress: 10/300 frames rendered
[BATCH_RENDERER] Progress: 20/300 frames rendered
...
[BATCH_RENDERER] ✓ Rendering complete: 300/300 frames in 15000ms (50ms/frame)
```

---

## Summary

**Don't try to parallelize HMR2 heavily.** It's GPU-intensive and doesn't scale well.

Instead:
- **Pose detection:** 2 workers (2x speedup, stable)
- **Mesh rendering:** 4 workers (4x speedup, parallelized)
- **Total:** 2.8x faster than sequential

This is the sweet spot for your hardware and workload.
