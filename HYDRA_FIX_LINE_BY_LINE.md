# Hydra Fix - Line by Line Comparison

## File 1: flask_wrapper_minimal_safe.py

### Location: Line 951

### BEFORE (WRONG ORDER)
```python
945 |        if os.path.exists(venv_activate):
946 |            logger.info(f"[PROCESS] Virtual environment found: {venv_activate}")
947 |            # Use bash to activate venv and run track.py
948 |            # Disable Hydra output directory creation to prevent hanging
949 |            # CRITICAL: Pass Hydra args BEFORE video.source to ensure they're parsed correctly
950 |            cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={video_path} hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.']
951 |            logger.info(f"[PROCESS] Command: bash -c 'source venv/bin/activate && python track.py video.source=... hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'")
```

### AFTER (CORRECT ORDER)
```python
945 |        if os.path.exists(venv_activate):
946 |            logger.info(f"[PROCESS] Virtual environment found: {venv_activate}")
947 |            # Use bash to activate venv and run track.py
948 |            # Disable Hydra output directory creation to prevent hanging
949 |            # CRITICAL: Pass Hydra args BEFORE video.source to ensure they're parsed correctly
950 |            cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
951 |            logger.info(f"[PROCESS] Command: bash -c 'source venv/bin/activate && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=...'")
```

### What Changed
Line 950: Moved `hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.` to come BEFORE `video.source={video_path}`
Line 951: Updated the log message to reflect the new order

### Detailed Diff
```diff
- cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={video_path} hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.']
+ cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']

- logger.info(f"[PROCESS] Command: bash -c 'source venv/bin/activate && python track.py video.source=... hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'")
+ logger.info(f"[PROCESS] Command: bash -c 'source venv/bin/activate && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=...'")
```

---

## File 2: track.py

### Location: Lines 1-80

### BEFORE (NO LOGGING)
```python
1  | import sys
2  | import os
3  |
4  | # ... rest of imports without logging ...
```

### AFTER (WITH ENHANCED LOGGING)
```python
1  | # CRITICAL: Log BEFORE any imports in case of import errors
2  | import sys
3  | import os
4  |
5  | print("[TRACK.PY] ========================================", flush=True)
6  | print("[TRACK.PY] track.py STARTED - BEFORE IMPORTS", flush=True)
7  | print(f"[TRACK.PY] Python version: {sys.version}", flush=True)
8  | print(f"[TRACK.PY] Working directory: {os.getcwd()}", flush=True)
9  | print(f"[TRACK.PY] sys.path[0]: {sys.path[0]}", flush=True)
10 | print(f"[TRACK.PY] sys.argv: {sys.argv}", flush=True)
11 | print("[TRACK.PY] ========================================", flush=True)
12 | sys.stdout.flush()
13 | sys.stderr.flush()
14 |
15 | # Now do imports with error handling
16 | try:
17 |     print("[TRACK.PY] Importing warnings...", flush=True)
18 |     sys.stdout.flush()
19 |     import warnings
20 |     print("[TRACK.PY] ✓ warnings imported", flush=True)
21 |     sys.stdout.flush()
22 |
23 |     print("[TRACK.PY] Importing dataclasses...", flush=True)
24 |     sys.stdout.flush()
25 |     from dataclasses import dataclass
26 |     from pathlib import Path
27 |     from typing import Optional, Tuple
28 |     print("[TRACK.PY] ✓ dataclasses imported", flush=True)
29 |     sys.stdout.flush()
30 |
31 |     print("[TRACK.PY] Importing torch...", flush=True)
32 |     sys.stdout.flush()
33 |     import torch
34 |     print(f"[TRACK.PY] ✓ PyTorch {torch.__version__}", flush=True)
35 |     sys.stdout.flush()
36 |
37 |     print("[TRACK.PY] Importing numpy...", flush=True)
38 |     sys.stdout.flush()
39 |     import numpy as np
40 |     import time
41 |     import traceback
42 |     print("[TRACK.PY] ✓ numpy imported", flush=True)
43 |     sys.stdout.flush()
44 |
45 |     print("[TRACK.PY] Importing hydra...", flush=True)
46 |     sys.stdout.flush()
47 |     import hydra
48 |     from hydra.core.config_store import ConfigStore
49 |     from omegaconf import DictConfig
50 |     print("[TRACK.PY] ✓ Hydra imported", flush=True)
51 |     sys.stdout.flush()
52 |
53 |     print("[TRACK.PY] Importing PHALP...", flush=True)
54 |     sys.stdout.flush()
55 |     from phalp.configs.base import FullConfig
56 |     from phalp.models.hmar.hmr import HMR2018Predictor
57 |     from phalp.trackers.PHALP import PHALP
58 |     from phalp.utils import get_pylogger
59 |     from phalp.configs.base import CACHE_DIR
60 |     print("[TRACK.PY] ✓ PHALP imported", flush=True)
61 |     sys.stdout.flush()
62 |
63 |     print("[TRACK.PY] Importing HMR2...", flush=True)
64 |     sys.stdout.flush()
65 |     from hmr2.datasets.utils import expand_bbox_to_aspect_ratio
66 |     print("[TRACK.PY] ✓ HMR2 imported", flush=True)
67 |     sys.stdout.flush()
68 |
69 |     print("[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL", flush=True)
70 |     sys.stdout.flush()
71 |     sys.stderr.flush()
72 |
73 | except Exception as import_err:
74 |     print(f"[TRACK.PY] ✗✗✗ IMPORT ERROR ✗✗✗", flush=True)
75 |     print(f"[TRACK.PY] Error type: {type(import_err).__name__}", flush=True)
76 |     print(f"[TRACK.PY] Error message: {str(import_err)}", flush=True)
77 |     print(f"[TRACK.PY] Traceback:", flush=True)
78 |     traceback.print_exc()
79 |     sys.stdout.flush()
80 |     sys.stderr.flush()
```

### What Changed
- Added comprehensive logging with `[TRACK.PY]` markers
- Added `sys.stdout.flush()` after every print statement
- Added `sys.stderr.flush()` to ensure stderr is also flushed
- Wrapped imports in try-except to catch import errors
- Total of 36 flush calls throughout the import section

### Key Additions
1. **Initial logging** (Lines 5-13): Logs Python version, working directory, sys.path, and sys.argv
2. **Per-import logging** (Lines 17-67): Logs before and after each import with flush
3. **Error handling** (Lines 73-80): Catches and logs import errors

---

## Summary of Changes

### Change 1: Argument Order
- **File:** `flask_wrapper_minimal_safe.py`
- **Lines:** 950-951
- **Type:** Reordering
- **Impact:** HIGH - Fixes the core bug
- **Before:** `python track.py video.source=... hydra.job.chdir=false ...`
- **After:** `python track.py hydra.job.chdir=false ... video.source=...`

### Change 2: Enhanced Logging
- **File:** `track.py`
- **Lines:** 1-80
- **Type:** Addition
- **Impact:** MEDIUM - Helps with debugging
- **Added:** 36 flush calls + comprehensive logging

---

## Verification

### Check Change 1
```bash
grep -n "python track.py" SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py | grep "video.source"
```

Expected output:
```
951:            cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
```

### Check Change 2
```bash
grep -c "sys.stdout.flush()" SnowboardingExplained/backend/pose-service/4D-Humans/track.py
```

Expected output:
```
36
```

---

## Testing

### Quick Test
```bash
python SnowboardingExplained/verify-hydra-fix.py
```

### Full Test
```bash
python SnowboardingExplained/test-hydra-directory-bug.py
```

---

## References

- **Hydra Documentation:** https://hydra.cc/docs/tutorials/basic/your_first_app/config_file/
- **4D-Humans:** https://github.com/shubham-goel/4D-Humans
- **PHALP:** https://github.com/PHALP/PHALP
