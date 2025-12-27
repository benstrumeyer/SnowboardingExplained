# Complete Debugging Guide - Mesh Rendering

## 1. Browser DevTools Debugging (Frontend)

### Opening DevTools
- **Windows/Linux**: Press `F12` or `Ctrl+Shift+I`
- **Mac**: Press `Cmd+Option+I`
- Or right-click → "Inspect"

### Console Tab
The console now has aggressive color-coded logs:

```
🟣 [MESH-UPDATE] - Purple logs for mesh update lifecycle
🟢 [MESH-CREATE] - Green logs for mesh creation details
🔵 [MESH-CREATE] - Cyan logs for data structure info
🔴 [MESH-CREATE] - Red logs for errors
🟠 [MESH-UPDATE] - Orange logs for warnings
```

### Reading the Logs

**When mesh loads, you'll see:**
```
[MESH-UPDATE] ═══════════════════════════════════════
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-UPDATE] Input state: { riderMeshExists: true, showRider: true, ... }
[MESH-CREATE] 🔍 Starting mesh creation
[MESH-CREATE] ✅ Detected SyncedFrame format
[MESH-CREATE] SyncedFrame meshData: { verticesCount: 6890, facesCount: 13776, ... }
[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅
[MESH-UPDATE] ✅ RIDER MESH ADDED TO SCENE
```

**If mesh fails, you'll see:**
```
[MESH-CREATE] ❌ CRITICAL: No vertices found!
[MESH-CREATE] Frame structure: { ... }
[MESH-CREATE] Full frame dump: { ... }
```

### Setting Breakpoints in Browser

1. **Open DevTools** → **Sources** tab
2. **Find the file**: `MeshViewer.tsx` (use Ctrl+P to search)
3. **Click line number** to set breakpoint (blue dot appears)
4. **Reload page** - execution will pause at breakpoint
5. **Inspect variables** in the right panel
6. **Step through code**:
   - Step Over (F10) - execute current line
   - Step Into (F11) - enter function calls
   - Step Out (Shift+F11) - exit current function
   - Continue (F8) - resume execution

### Useful Console Commands

```javascript
// Check if mesh data is loaded
console.log(window.__MESH_DATA__)

// Inspect Three.js scene
console.log(scene.children)

// Check mesh properties
const mesh = scene.getObjectByName('mesh-rider')
console.log(mesh.geometry.attributes.position.count)

// Monitor network requests
// Open Network tab, reload, watch for /api/mesh-data/:videoId
```

---

## 2. Backend Debugging (Node.js)

### Option A: VS Code Debugger (Recommended)

**Setup:**
1. Open `SnowboardingExplained/backend` folder in VS Code
2. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Server",
      "program": "${workspaceFolder}/src/server.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

**Usage:**
1. Press `F5` to start debugging
2. Set breakpoints by clicking line numbers
3. Execution pauses at breakpoints
4. Inspect variables in left panel
5. Use Debug Console to run commands

### Option B: Node Inspector (Command Line)

```bash
# Start backend with debugger
node --inspect-brk dist/server.js

# Open Chrome DevTools
# Navigate to: chrome://inspect
# Click "inspect" on the running process
```

### Option C: Console Logging (Quick & Dirty)

Add logs to `server.ts` at the `/api/mesh-data/:videoId` endpoint:

```typescript
app.get('/api/mesh-data/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  
  console.log('\n%c[API-MESH-DATA] ═══════════════════════════════════════', 'color: #FF00FF; font-weight: bold;');
  console.log('%c[API-MESH-DATA] 📥 REQUEST RECEIVED', 'color: #FF00FF; font-weight: bold;');
  console.log('%c[API-MESH-DATA] videoId:', 'color: #FF00FF;', videoId);
  
  try {
    await meshDataService.connect();
    const meshData = await meshDataService.getMeshData(videoId);
    
    if (!meshData) {
      console.error('%c[API-MESH-DATA] ❌ Mesh data not found', 'color: #FF0000; font-weight: bold;');
      return res.status(404).json({ error: 'Not found' });
    }
    
    console.log('%c[API-MESH-DATA] ✅ Mesh data found', 'color: #00FF00; font-weight: bold;');
    console.log('%c[API-MESH-DATA] Frame count:', 'color: #00FF00;', meshData.frames?.length);
    
    if (meshData.frames && meshData.frames.length > 0) {
      const firstFrame = meshData.frames[0] as any;
      console.log('%c[API-MESH-DATA] First frame vertices:', 'color: #00FFFF;', {
        count: firstFrame.mesh_vertices_data?.length || 0,
        sample: firstFrame.mesh_vertices_data?.[0]
      });
      console.log('%c[API-MESH-DATA] First frame faces:', 'color: #00FFFF;', {
        count: firstFrame.mesh_faces_data?.length || 0,
        sample: firstFrame.mesh_faces_data?.[0]
      });
    }
    
    // ... rest of endpoint
  } catch (err) {
    console.error('%c[API-MESH-DATA] ❌ ERROR:', 'color: #FF0000; font-weight: bold;', err);
  }
});
```

---

## 3. Data Flow Debugging

### Trace the Complete Flow

**Frontend → Backend → Database → Frontend**

1. **Frontend sends request**
   - Open DevTools → Network tab
   - Look for request to `/api/mesh-data/v_1766828373685_1`
   - Click it, check Response tab
   - Verify `data.frames[0].meshData.vertices` has data

2. **Backend receives request**
   - Check backend terminal output
   - Look for `[API-MESH-DATA]` logs
   - Verify `meshData.frames` is populated

3. **Database has data**
   - Run MongoDB query:
   ```bash
   # In MongoDB shell
   db.mesh_frames.findOne({ videoId: "v_1766828373685_1" })
   # Check mesh_vertices_data and mesh_faces_data fields
   ```

4. **Frontend receives response**
   - Check Network tab Response
   - Verify structure matches SyncedFrame type
   - Check `meshData.vertices` and `meshData.faces`

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No vertices found" | Backend returning empty arrays | Check pose service is running |
| Mesh not rendering | Vertices exist but faces empty | Check mesh_faces_data in DB |
| Wrong mesh position | Rotation/position not applied | Check riderRotation props |
| Mesh disappears | Opacity set to 0 | Check riderOpacity prop |

---

## 4. Debugging Checklist

### Before Debugging
- [ ] All 4 services running (backend, frontend, pose-service, ngrok)
- [ ] MongoDB and Redis running
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Browser console open (F12)

### During Debugging
- [ ] Check console for color-coded logs
- [ ] Verify frame data structure in Network tab
- [ ] Set breakpoints in `createMeshFromFrame()`
- [ ] Inspect `vertices` and `faces` arrays
- [ ] Check mesh is added to scene

### After Debugging
- [ ] Remove debug logs before committing
- [ ] Verify mesh renders correctly
- [ ] Test with multiple videos
- [ ] Check performance (no lag)

---

## 5. Quick Debug Commands

### Browser Console
```javascript
// Get current mesh
const mesh = scene.getObjectByName('mesh-rider')

// Check geometry
mesh.geometry.attributes.position.count  // vertex count
mesh.geometry.index.count                 // face count

// Check material
mesh.material.color.getHexString()        // color
mesh.material.opacity                     // opacity

// Check position/rotation
mesh.position
mesh.rotation

// Dump entire frame data
console.table(window.__FRAME_DATA__)
```

### Backend Terminal
```bash
# Watch logs in real-time
tail -f backend.log | grep MESH

# Search for errors
grep -i error backend.log | tail -20

# Count mesh requests
grep -c "mesh-data" backend.log
```

---

## 6. Performance Profiling

### Chrome DevTools Performance Tab
1. Open DevTools → Performance tab
2. Click record (red circle)
3. Interact with mesh (rotate, zoom)
4. Click stop
5. Analyze flame chart for bottlenecks

### Common Performance Issues
- **Slow mesh creation**: Too many vertices/faces
- **Lag on rotation**: Inefficient Three.js rendering
- **Memory leak**: Not disposing geometries properly

---

## 7. Network Debugging

### Check API Response
1. DevTools → Network tab
2. Filter by `/api/mesh-data`
3. Click request
4. Response tab shows JSON
5. Check structure:
```json
{
  "success": true,
  "data": {
    "frames": [
      {
        "meshData": {
          "vertices": [[x, y, z], ...],
          "faces": [[0, 1, 2], ...]
        }
      }
    ]
  }
}
```

### Slow Response?
- Check backend logs for query time
- Verify MongoDB indexes exist
- Check network latency (Timing tab)

---

## 8. Common Debugging Scenarios

### Scenario 1: Mesh Not Showing
```
1. Check console for [MESH-CREATE] ❌ CRITICAL
2. Verify vertices array is not empty
3. Check faces array has data
4. Verify mesh was added to scene
5. Check camera position (might be inside mesh)
```

### Scenario 2: Wrong Mesh Data
```
1. Check Network tab response
2. Verify videoId matches
3. Check frame count is correct
4. Inspect first frame structure
5. Compare with database directly
```

### Scenario 3: Mesh Rendering But Wrong
```
1. Check mesh position/rotation
2. Verify color is correct
3. Check opacity setting
4. Verify scale is reasonable
5. Check lighting in scene
```

---

## 9. Useful VS Code Extensions

- **Debugger for Chrome** - Debug frontend in VS Code
- **MongoDB for VS Code** - Query MongoDB directly
- **REST Client** - Test API endpoints
- **Thunder Client** - Alternative to Postman

---

## 10. Getting Help

When reporting issues, include:
1. Screenshot of console logs (with colors)
2. Network tab response JSON
3. Backend terminal output
4. MongoDB query result
5. Browser/OS version
