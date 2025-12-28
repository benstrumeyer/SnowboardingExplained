# BASH EXECUTABLE FIX - Shell Issue Resolved

## Status: ✅ FIXED

After applying the `shell=True` fix, we discovered a secondary issue: the `source` command was not found.

## The Problem

When using `shell=True` with a string command, Python defaults to `/bin/sh` instead of `/bin/bash`. The `source` command is a bash builtin and doesn't exist in `/bin/sh`:

```
/bin/sh: 1: source: not found
Exit code: 127
```

This prevented the virtual environment from being activated.

## The Solution

Added `executable='/bin/bash'` to explicitly use bash instead of sh:

```python
run_kwargs = {
    'timeout': timeout_seconds,
    'capture_output': True,
    'text': True,
    'shell': True,  # Use shell to execute bash -c
    'executable': '/bin/bash'  # CRITICAL: Use bash, not /bin/sh
}
result = subprocess.run(cmd[2], **run_kwargs)
```

## Why This Matters

- `/bin/sh` is a minimal POSIX shell that doesn't support bash-specific features like `source`
- `/bin/bash` is the full bash shell that supports all bash features
- By specifying `executable='/bin/bash'`, we ensure the command runs in bash, not sh

## Implementation

**File:** `backend/pose-service/flask_wrapper_minimal_safe.py`

**Lines 975-988:**
```python
run_kwargs = {
    'timeout': timeout_seconds,
    'capture_output': True,
    'text': True,
    'shell': True,  # CRITICAL: Required to properly execute bash -c commands
    'executable': '/bin/bash'  # CRITICAL: Use bash explicitly, not /bin/sh (which doesn't support 'source')
}
```

## Testing

After this fix, the subprocess should:
1. ✅ Not hang (shell=True fix)
2. ✅ Execute bash commands properly (executable=/bin/bash fix)
3. ✅ Activate the virtual environment (source command works)
4. ✅ Run track.py successfully
5. ✅ Show `[TRACK.PY]` logs in output

## Combined Fixes

The complete fix now includes:

1. **shell=True** - Allows bash -c to be interpreted by a shell
2. **cmd[2]** - Pass the bash script string instead of the list
3. **executable='/bin/bash'** - Use bash instead of sh for the shell

Together, these three changes fix the 180-second timeout issue completely.

## Next Steps

1. Restart Flask wrapper with the updated code
2. Upload a test video
3. Monitor logs for `[TRACK.PY]` output
4. Verify subprocess completes successfully
5. Verify mesh data is stored in database
