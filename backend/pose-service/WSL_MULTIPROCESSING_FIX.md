# WSL Multiprocessing Fix

## Problem

When running the parallel video processor in WSL, the worker pool crashes with:
```
WSL is exiting unexpectedly
```

This happens because WSL doesn't support the default `fork` start method for multiprocessing.

## Solution

The worker pool now automatically detects WSL and uses the `spawn` start method instead.

### What Changed

1. **Automatic WSL Detection** - The pool detects if running in WSL and switches to `spawn` method
2. **Spawn Context** - Uses explicit spawn context for queue and process creation
3. **Error Handling** - Better error messages if worker startup fails

### How It Works

```python
# Automatic detection and configuration
ctx = mp.get_context('spawn')
self.task_queue = ctx.Queue()
self.result_queue = ctx.Queue()
self.stop_event = ctx.Event()

worker = ctx.Process(
    target=pose_worker_process,
    args=(i, self.task_queue, self.result_queue, self.stop_event),
    daemon=False,
)
```

## Testing in WSL

```bash
# Run the test suite
python test_parallel_processing.py

# Or test directly
python -c "
from parallel_video_processor import ParallelVideoProcessor
processor = ParallelVideoProcessor(num_workers=2)
print('Worker pool initialized successfully')
"
```

## Troubleshooting

### Still Getting WSL Crashes

1. **Check WSL version**
   ```bash
   wsl --version
   ```
   Update to latest WSL2 if needed

2. **Check Python version**
   ```bash
   python --version
   ```
   Use Python 3.8+ for best multiprocessing support

3. **Check available memory**
   ```bash
   free -h
   ```
   Each worker needs ~500MB for HMR2 model

4. **Reduce worker count**
   ```python
   processor = ParallelVideoProcessor(num_workers=2)  # Start with 2
   ```

### Connection Refused Errors

If you see `ECONNREFUSED` errors:

1. **Check if pose service is running**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check WSL networking**
   ```bash
   # From Windows, get WSL IP
   wsl hostname -I
   
   # From WSL, check if service is listening
   netstat -tlnp | grep 5000
   ```

3. **Use localhost instead of IP**
   ```python
   # In your client code
   url = "http://localhost:5000"  # Not 172.24.x.x
   ```

## Performance in WSL

WSL multiprocessing is slightly slower than native Linux due to:
- Spawn overhead (each worker starts fresh)
- WSL2 virtualization layer
- Shared memory limitations

Expected performance:
- **Native Linux**: 3-5x speedup
- **WSL2**: 2-3x speedup

To improve performance:
1. Use WSL2 (not WSL1)
2. Allocate more CPU cores to WSL
3. Reduce worker count if memory is limited
4. Use SSD for better I/O

## Configuration

### WSL2 Settings

Edit `~/.wslconfig` (Windows home directory):

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true
```

Then restart WSL:
```bash
wsl --shutdown
```

### Environment Variables

```bash
# Increase multiprocessing buffer size
export PYTHONUNBUFFERED=1

# Use spawn method explicitly
export PYTHONMULTIPROCESSING_START_METHOD=spawn

# Run the processor
python app_parallel.py
```

## References

- [Python multiprocessing documentation](https://docs.python.org/3/library/multiprocessing.html)
- [WSL2 configuration](https://docs.microsoft.com/en-us/windows/wsl/wsl-config)
- [WSL networking](https://docs.microsoft.com/en-us/windows/wsl/networking)
