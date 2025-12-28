# Pose Video WSL Execution Fix

## Problem
The `/api/pose/video` endpoint was failing with "The system cannot find the path specified" error when trying to execute track.py.

**Root Cause:** The `execSync` command was being executed in the Windows cmd shell, not in WSL. When the command tried to run `cd /home/ben/pose-service`, it failed because that path doesn't exist on Windows.

## Solution
Wrap the bash command with `wsl bash -c` to execute it in the WSL environment instead of Windows cmd.

### Before
```typescript
const output = execSync(cmd, {
  timeout: 600000,
  stdio: 'pipe',
  encoding: 'utf-8'
});
```

### After
```typescript
const output = execSync(`wsl bash -c "${cmd}"`, {
  timeout: 600000,
  stdio: 'pipe',
  encoding: 'utf-8'
});
```

## How It Works
1. `wsl bash -c` tells Windows to execute the command in WSL's bash shell
2. The entire command string is wrapped in quotes so it's passed as a single argument to bash
3. Inside WSL, the command can now access `/home/ben/pose-service` and run Python with the venv

## File Changed
- `SnowboardingExplained/backend/src/api/pose-video.ts` (line ~60)

## Testing
1. Backend restarted with the fix
2. Upload a video through the frontend
3. The `/api/pose/video` endpoint should now successfully execute track.py in WSL
4. Video processing should complete without "path not found" errors

## Status
✓ Fix applied and backend restarted
✓ Ready for testing
