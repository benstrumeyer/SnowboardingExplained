# Quick Debug Reference Card

## 🎯 What to Look For

### In Browser Console (F12)
```
🟣 PURPLE = Mesh update lifecycle
🟢 GREEN = Success messages  
🔴 RED = Errors
🟠 ORANGE = Warnings
🔵 CYAN = Data details
```

### Key Log Patterns

**✅ Good - Mesh Rendering:**
```
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-CREATE] ✅ Detected SyncedFrame format
[MESH-CREATE] SyncedFrame meshData: { verticesCount: 6890, facesCount: 13776 }
[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅
[MESH-UPDATE] ✅ RIDER MESH ADDED TO SCENE
```

**❌ Bad - Mesh Not Rendering:**
```
[MESH-CREATE] ❌ CRITICAL: No vertices found!
[MESH-CREATE] Frame structure: { ... }
```

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for [MESH-UPDATE] and [MESH-CREATE] logs
4. Check for red error messages
```

### Step 2: Check Network Response
```
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Look for /api/mesh-data/v_... request
5. Click it, check Response tab
6. Verify data.frames[0].meshData.vertices has values
```

### Step 3: Set Breakpoint
```
1. Open DevTools (F12)
2. Go to Sources tab
3. Find MeshViewer.tsx (Ctrl+P)
4. Click line number to set breakpoint
5. Reload page
6. Execution pauses at breakpoint
7. Inspect variables in right panel
```

### Step 4: Check Backend Logs
```
1. Look at backend terminal output
2. Search for [API-MESH-DATA] logs
3. Check if mesh data is found in database
4. Verify frame count and vertex count
```

---

## 📊 Data Structure to Verify

### Frontend Receives (SyncedFrame)
```javascript
{
  frameIndex: 0,
  timestamp: 1234567890,
  meshData: {
    keypoints: [...],
    skeleton: [...],
    vertices: [[x, y, z], [x, y, z], ...],  // Should have ~6890 items
    faces: [[0, 1, 2], [1, 2, 3], ...]      // Should have ~13776 items
  }
}
```

### If vertices is empty
- ❌ Pose service not returning mesh data
- ❌ Backend not storing mesh data
- ❌ Database query returning empty

### If faces is empty
- ⚠️ Mesh will render as point cloud
- ⚠️ Check mesh_faces_data in database

---

## 🛠️ Quick Fixes

| Problem | Check | Fix |
|---------|-------|-----|
| "No vertices found" | Backend logs | Restart pose service |
| Mesh not visible | Camera position | Zoom out (scroll wheel) |
| Wrong mesh data | Network tab | Refresh page |
| Mesh disappears | Opacity | Check riderOpacity prop |
| Mesh in wrong place | Rotation | Check riderRotation prop |

---

## 🎮 Browser DevTools Shortcuts

| Action | Shortcut |
|--------|----------|
| Open DevTools | F12 |
| Console tab | Ctrl+Shift+J |
| Network tab | Ctrl+Shift+E |
| Sources tab | Ctrl+Shift+P |
| Search files | Ctrl+P |
| Find in file | Ctrl+F |
| Step over | F10 |
| Step into | F11 |
| Step out | Shift+F11 |
| Continue | F8 |

---

## 📝 Console Commands

```javascript
// Check if mesh exists
scene.getObjectByName('mesh-rider')

// Get vertex count
mesh.geometry.attributes.position.count

// Get face count
mesh.geometry.index.count

// Check mesh color
mesh.material.color.getHexString()

// Check mesh position
mesh.position

// Dump all scene objects
scene.children.forEach(obj => console.log(obj.name))
```

---

## 🚀 Start Fresh

If everything is broken:

```bash
# Kill all processes
# Restart all 4 terminals:
1. npm run dev (frontend)
2. ./start-backend.bat (backend)
3. ngrok http 3001 (tunnel)
4. WSL pose service (python app.py)

# Refresh browser
# Open DevTools (F12)
# Check console logs
```

---

## 📞 When Stuck

1. **Check console logs** - Look for red errors
2. **Check Network tab** - Verify API response
3. **Check backend logs** - Look for [API-MESH-DATA]
4. **Set breakpoint** - Pause execution and inspect
5. **Check database** - Verify data exists
6. **Restart services** - Sometimes helps
7. **Clear cache** - Ctrl+Shift+Delete
8. **Check browser console** - Look for JavaScript errors

---

## 🎨 Color Legend

```
🟣 Purple  = [MESH-UPDATE] - Mesh lifecycle
🟢 Green   = ✅ Success
🔴 Red     = ❌ Error
🟠 Orange  = ⚠️ Warning
🔵 Cyan    = 📊 Data info
```

---

## 📍 Key Files

- **Frontend**: `SnowboardingExplained/backend/web/src/components/MeshViewer.tsx`
- **Backend**: `SnowboardingExplained/backend/src/server.ts` (line ~1010)
- **Database**: MongoDB collection `mesh_frames`
- **Pose Service**: `SnowboardingExplained/backend/pose-service/app.py`

---

## ✅ Checklist Before Debugging

- [ ] All 4 services running
- [ ] MongoDB and Redis running
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] Network tab ready
- [ ] Backend terminal visible
- [ ] No TypeScript errors
