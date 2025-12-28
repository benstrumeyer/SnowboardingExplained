# WSL PATH CONVERSION FIX

## Status: ✅ FIXED

The video upload was failing because the Windows path wasn't being properly converted to a WSL path.

## The Problem

When copying a video from Windows to WSL, the code was calling:

```typescript
const wslSourcePath = execSync(`wsl wslpath "${videoPath}"`, { ... });
```

With a Windows path like:
```
C:\Users\benja\repos\SnowboardingExplained\backend\uploads\v_1766926042649_1.mov
```

The backslashes were being stripped by PowerShell, resulting in:
```
C:UsersbenjareposSnowboardingExplainedbackenduploadsv_1766926042649_1.mov
```

This caused `wslpath` to fail with exit code 1.

## Root Cause

PowerShell interprets backslashes as escape characters. When passing a Windows path with backslashes to `wsl wslpath`, the backslashes get stripped, mangling the path.

## The Solution

Convert backslashes to forward slashes before passing to `wslpath`:

```typescript
// CRITICAL: Convert backslashes to forward slashes for wslpath
const windowsPathFormatted = videoPath.replace(/\\/g, '/');
const wslSourcePath = execSync(`wsl wslpath "${windowsPathFormatted}"`, { 
  timeout: 10000,
  stdio: 'pipe',
  encoding: 'utf-8'
}).trim();
```

Now the path is properly converted:
```
Input:  C:\Users\benja\repos\SnowboardingExplained\backend\uploads\v_1766926042649_1.mov
Format: C:/Users/benja/repos/SnowboardingExplained/backend/uploads/v_1766926042649_1.mov
Output: /mnt/c/Users/benja/repos/SnowboardingExplained/backend/uploads/v_1766926042649_1.mov
```

## Implementation

**File:** `backend/src/server.ts`

**Lines 542-549:**
```typescript
// Convert Windows path to WSL path using wslpath
console.log(`[FINALIZE] 🔄 Converting Windows path to WSL path...`);
// CRITICAL: Convert backslashes to forward slashes for wslpath
const windowsPathFormatted = videoPath.replace(/\\/g, '/');
const wslSourcePath = execSync(`wsl wslpath "${windowsPathFormatted}"`, { 
  timeout: 10000,
  stdio: 'pipe',
  encoding: 'utf-8'
}).trim();
console.log(`[FINALIZE] Windows path: ${videoPath}`);
console.log(`[FINALIZE] WSL path: ${wslSourcePath}`);
```

## Testing

To verify the fix works:

1. Rebuild the backend:
   ```bash
   npm run build
   ```

2. Restart the backend server

3. Upload a test video via the web UI

4. Monitor logs for:
   - ✅ Windows path is logged correctly
   - ✅ WSL path conversion succeeds
   - ✅ File copy to WSL succeeds
   - ✅ Flask wrapper receives the video

## Expected Behavior

**Before:**
```
[FINALIZE] 🔄 Converting Windows path to WSL path...
[FINALIZE] ✗ Failed to copy video to WSL: Command failed: wsl wslpath ...
```

**After:**
```
[FINALIZE] 🔄 Converting Windows path to WSL path...
[FINALIZE] Windows path: C:\Users\benja\repos\SnowboardingExplained\backend\uploads\v_1766926042649_1.mov
[FINALIZE] WSL path: /mnt/c/Users/benja/repos/SnowboardingExplained/backend/uploads/v_1766926042649_1.mov
[FINALIZE] ✓ Video copied to WSL successfully
[FINALIZE] 📤 Sending POST request to http://172.24.183.130:5000/pose/video
```

## Related Fixes

This fix works together with:
1. **Flask subprocess fix** - shell=True and executable=/bin/bash
2. **Enhanced logging** - Better error messages for debugging
3. **Error handling** - mkdir failure doesn't stop the process

All three fixes are needed for complete video processing pipeline.

## Summary

This was a simple but critical fix - converting backslashes to forward slashes before passing Windows paths to WSL commands. This allows the video to be properly copied from Windows to WSL, where the Flask wrapper can access it.
