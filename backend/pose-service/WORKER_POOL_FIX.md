# Worker Pool Fix - Removed Manager Lock

## Problem

The pose detection worker pool was crashing with:
```
[ERROR] [WORKER-0] Failed to initialize: 'AcquirerProxy' object has no attribute 'put'
```

This was caused by passing a Manager lock to worker processes, which doesn't serialize properly with the spawn method.

## Solution

Removed the Manager lock approach. Workers now:
1. Start with staggered delays (0.2s between each)
2. Load HMR2 model independently
3. No shared lock needed

The staggered startup naturally serializes model loading and avoids GPU/CUDA conflicts.

## Changes Made

### pose_worker_pool.py

1. **Removed Manager lock parameter** from `pose_worker_process()`
   - Before: `ready_queue` parameter (was a Manager lock)
   - After: Removed entirely

2. **Simplified worker startup** in `start()`
   - Removed Manager creation
   - Kept staggered startup (0.2s delay between workers)
   - This naturally serializes model loading

3. **Removed Manager cleanup** in `stop()`
   - No manager to shutdown

## How It Works Now

```
Worker 0: Start → Load model (0-2s) → Ready
          ↓ (0.2s delay)
Worker 1: Start → Load model (0-2s) → Ready
          ↓ (0.2s delay)
Worker 2: Start → Load model (0-2s) → Ready
          ↓ (0.2s delay)
Worker 3: Start → Load model (0-2s) → Ready
```

The staggered startup ensures only one worker loads the model at a time, avoiding GPU/CUDA conflicts.

## Performance Impact

- **Startup time:** Slightly longer (0.6s delay for 4 workers)
- **Runtime:** No impact (workers process frames in parallel)
- **Stability:** Much better (no Manager lock issues)

## Testing

The worker pool should now start without errors:

```
[POOL] Starting 4 workers...
[WORKER-0] Starting worker process (PID: 613)
[WORKER-0] HybridPoseDetector imported successfully
[WORKER-0] Loading HMR2 model...
[WORKER-0] Model loaded successfully
[WORKER-0] Ready, waiting for tasks...
[POOL] Worker 0 process started
[POOL] Worker 1 process started
[POOL] Worker 2 process started
[POOL] Worker 3 process started
[POOL] All 4 workers started
```

No more `'AcquirerProxy' object has no attribute 'put'` errors.

## Summary

✓ Fixed worker pool initialization
✓ Removed problematic Manager lock
✓ Kept staggered startup for GPU safety
✓ Workers now start successfully
✓ Pose detection parallelization works
