# Cleanup Logic Added to Video Processing Pipeline

## Overview
Added automatic cleanup of temporary video files from WSL after Flask processing completes. This ensures the `/tmp/pose-videos/` directory doesn't accumulate stale files.

## Implementation Details

### Location
`SnowboardingExplained/backend/src/server.ts` - `/api/finalize-upload` endpoint (lines 515-630)

### What Was Added

#### 1. **Success Path Cleanup** (After Flask returns successfully)
```typescript
// Clean up temporary video file from WSL
console.log(`[FINALIZE] 🧹 Cleaning up temporary video from WSL: ${wslVideoPath}`);
try {
  execSync(`wsl rm -f "${wslVideoPath}"`, { 
    timeout: 10000, // 10 second timeout for cleanup
    stdio: 'pipe'
  });
  console.log(`[FINALIZE] ✓ Temporary video deleted from WSL`);
} catch (cleanupErr: any) {
  console.warn(`[FINALIZE] ⚠️  Failed to delete temporary video: ${cleanupErr.message}`);
  // Don't fail the entire request if cleanup fails
}
```

#### 2. **Error Path Cleanup** (If Flask processing fails)
```typescript
} catch (flaskErr: any) {
  // Clean up temporary video file from WSL even on error
  console.log(`[FINALIZE] 🧹 Cleaning up temporary video from WSL after error: ${wslVideoPath}`);
  try {
    execSync(`wsl rm -f "${wslVideoPath}"`, { 
      timeout: 10000, // 10 second timeout for cleanup
      stdio: 'pipe'
    });
    console.log(`[FINALIZE] ✓ Temporary video deleted from WSL`);
  } catch (cleanupErr: any) {
    console.warn(`[FINALIZE] ⚠️  Failed to delete temporary video: ${cleanupErr.message}`);
    // Don't fail the entire request if cleanup fails
  }
  // ... rest of error handling
}
```

### Key Features

1. **Dual Cleanup Paths**: Cleanup happens both on success and error
2. **Non-Blocking**: Cleanup failures don't cause the entire request to fail
3. **Timeout Protection**: 10-second timeout prevents cleanup from hanging
4. **Logging**: All cleanup operations are logged with clear indicators
5. **Scope Management**: `wslVideoPath` and `execSync` are declared at outer scope so they're accessible in both try and catch blocks

### Flow

1. **Upload & Assembly**: Video chunks assembled on Windows
2. **Copy to WSL**: Video copied to `/tmp/pose-videos/{videoId}.mov`
3. **Flask Processing**: Flask processes video from WSL path
4. **Cleanup**: Temporary file deleted from WSL (success or error)
5. **MongoDB Save**: Mesh data saved to database

### Logging Output

**Success case:**
```
[FINALIZE] 🧹 Cleaning up temporary video from WSL: /tmp/pose-videos/{videoId}.mov
[FINALIZE] ✓ Temporary video deleted from WSL
```

**Error case:**
```
[FINALIZE] 🧹 Cleaning up temporary video from WSL after error: /tmp/pose-videos/{videoId}.mov
[FINALIZE] ✓ Temporary video deleted from WSL
```

**Cleanup failure (non-blocking):**
```
[FINALIZE] ⚠️  Failed to delete temporary video: {error message}
```

## Benefits

- **Disk Space**: Prevents accumulation of temporary video files on WSL
- **Clean State**: Each upload starts fresh without leftover files
- **Reliability**: Cleanup happens regardless of Flask success/failure
- **Observability**: Clear logging of cleanup operations for debugging

## Files Modified

- `SnowboardingExplained/backend/src/server.ts` - Added cleanup logic in `/api/finalize-upload` endpoint

## Testing

The cleanup logic will be tested during end-to-end video upload testing:
1. Upload a video
2. Check backend logs for cleanup messages
3. Verify `/tmp/pose-videos/` directory is cleaned up after processing
4. Test both success and error scenarios
