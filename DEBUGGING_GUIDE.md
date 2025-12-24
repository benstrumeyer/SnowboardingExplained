# Debugging Guide: Breakpoints & Memory Inspection in VS Code

## Part 1: Setting Up Node.js Debugging

### Step 1: Create a Debug Configuration

1. Open VS Code
2. Click the **Debug** icon on the left sidebar (looks like a play button with a bug)
3. Click **"Create a launch.json file"** or **"Add Configuration"**
4. Select **"Node.js"** as the environment

This creates `.vscode/launch.json`. Replace it with:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "program": "${workspaceFolder}/SnowboardingExplained/backend/src/server.ts",
      "restart": true,
      "runtimeArgs": ["-r", "ts-node/register"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Step 2: Start Debugging

1. Press **F5** or click the green play button in the Debug panel
2. The backend will start with debugging enabled
3. You'll see "Debugger attached" in the terminal

## Part 2: Setting Breakpoints

### Method 1: Click to Set Breakpoint

1. Open `SnowboardingExplained/backend/src/server.ts`
2. Find the upload endpoint (around line 480)
3. **Click on the line number** where you want to pause
4. A red dot appears = breakpoint is set

Example: Click line 480 to break at the start of the upload handler:

```typescript
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  // ← Click the line number here (480)
  try {
```

### Method 2: Add Breakpoint in Code

Add this line where you want to pause:

```typescript
debugger;  // Execution will pause here when debugger is running
```

Example:

```typescript
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  debugger;  // ← Pauses here when you upload
  try {
    const { role } = req.body;
    console.log('Role:', role);
```

## Part 3: Inspecting Memory & Variables

### When Execution Pauses at a Breakpoint:

1. **Variables Panel** (left sidebar, "Variables" tab):
   - Shows all local variables
   - Shows `req` object with upload data
   - Shows `req.file` with file info

2. **Hover Over Variables**:
   - Hover over any variable to see its value
   - Example: hover over `req.file` to see file size

3. **Watch Expressions** (add custom watches):
   - Click the **+** in the "Watch" panel
   - Type: `req.file.size` to watch file size
   - Type: `req.body` to watch form data

### Example: Inspect Upload Data

When paused at the upload endpoint:

```
Variables Panel shows:
├── req
│   ├── file
│   │   ├── fieldname: "video"
│   │   ├── originalname: "my_video.mov"
│   │   ├── encoding: "7bit"
│   │   ├── mimetype: "video/quicktime"
│   │   ├── size: 1234567890  ← FILE SIZE IN BYTES
│   │   ├── destination: "/path/to/uploads"
│   │   ├── filename: "video-1234567890.mov"
│   │   └── path: "/path/to/uploads/video-1234567890.mov"
│   ├── body
│   │   └── role: "rider"
│   └── ...
```

## Part 4: Step Through Code

When paused at a breakpoint:

| Button | Keyboard | Action |
|--------|----------|--------|
| Step Over | F10 | Execute next line, don't enter functions |
| Step Into | F11 | Enter the function on this line |
| Step Out | Shift+F11 | Exit current function, return to caller |
| Continue | F5 | Resume execution until next breakpoint |

Example workflow:

```typescript
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  debugger;  // ← Pauses here
  
  const { role } = req.body;  // F10 to step over this line
  
  if (!req.file) {  // F10 to step over
    return res.status(400).json({ error: 'No file' });
  }
  
  console.log('File size:', req.file.size);  // F10 to execute
  // Now check Variables panel to see req.file.size value
```

## Part 5: Debug the Upload Issue

### Step-by-Step Debugging for Your Upload Problem:

1. **Set breakpoint at line 480** (start of upload endpoint)
2. **Press F5** to start debugging
3. **Upload your large video** from the UI
4. **Execution pauses** at the breakpoint
5. **Check Variables panel**:
   - Look at `req.file.size` - is it the full file size?
   - Look at `req.body.role` - is it set correctly?
6. **Press F10** to step to next line
7. **Check for errors** in the console

### Add Logging Breakpoints:

Right-click on a breakpoint (red dot) → **Edit Breakpoint** → Add a log message:

```
File size: {req.file.size}, Role: {req.body.role}
```

This logs without pausing execution.

## Part 6: Console Debugging

While paused, use the **Debug Console** (bottom panel):

```javascript
// Type these commands while paused:
req.file.size
req.file.originalname
req.body
Object.keys(req.file)
```

The console shows the values immediately.

## Part 7: Common Issues to Check

When debugging the upload:

1. **Is `req.file` defined?**
   - If undefined, multer didn't receive the file
   - Check: `req.file` in Variables panel

2. **What's the file size?**
   - Check: `req.file.size` (in bytes)
   - Divide by 1024*1024 to get MB: `req.file.size / (1024*1024)`

3. **Is the role set?**
   - Check: `req.body.role`

4. **What error is thrown?**
   - Look at the console output
   - Check the `catch` block

## Part 8: Add Debug Logging

Add this to the upload endpoint to see what's happening:

```typescript
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  debugger;  // Pause here
  
  console.log('=== UPLOAD DEBUG ===');
  console.log('File received:', !!req.file);
  console.log('File size (bytes):', req.file?.size);
  console.log('File size (MB):', (req.file?.size || 0) / (1024 * 1024));
  console.log('File name:', req.file?.originalname);
  console.log('Role:', req.body.role);
  console.log('===================');
  
  try {
    // ... rest of code
  } catch (err) {
    console.error('ERROR:', err);
    debugger;  // Pause on error
  }
});
```

## Part 9: Quick Reference

| Task | How To |
|------|--------|
| Set breakpoint | Click line number |
| Remove breakpoint | Click red dot again |
| Pause execution | F5 (if running) or hit breakpoint |
| Resume | F5 |
| Step over | F10 |
| Step into | F11 |
| View variables | Left panel → Variables tab |
| Watch expression | Left panel → Watch tab → + |
| Console | Bottom panel → Debug Console |
| Conditional breakpoint | Right-click breakpoint → Edit |

## Part 10: Troubleshooting

**Debugger won't start:**
- Make sure backend isn't already running
- Kill any existing Node processes: `taskkill /F /IM node.exe` (Windows)

**Breakpoints not working:**
- Make sure you're in debug mode (F5)
- Check that the file is TypeScript (`.ts`)
- Restart the debugger

**Can't see variables:**
- Make sure execution is paused (yellow highlight on line)
- Check Variables panel on left sidebar
- Try hovering over the variable name

## Next Steps

1. Start debugging with F5
2. Upload your large video
3. When paused, check `req.file.size` in Variables panel
4. Tell me what you see - that will help us find the real issue!
