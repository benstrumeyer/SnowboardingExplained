# WSL Setup Checklist

Follow this checklist to get everything running. Estimated time: 30-45 minutes.

---

## Phase 1: Install WSL2 (5 minutes)

- [ ] Open PowerShell as Administrator
- [ ] Run: `wsl --install`
- [ ] Wait for installation to complete
- [ ] Restart Windows
- [ ] Verify: `wsl --list --verbose` shows Ubuntu with VERSION 2

---

## Phase 2: Set Up Ubuntu (5 minutes)

- [ ] Open PowerShell and run: `wsl`
- [ ] Create username (e.g., `user`)
- [ ] Create password (e.g., `password123`)
- [ ] Run: `sudo apt update`
- [ ] Run: `sudo apt upgrade -y`
- [ ] Wait for updates to complete

---

## Phase 3: Install Python (5 minutes)

- [ ] Run: `sudo apt install -y python3.9 python3.9-venv python3.9-dev python3-pip`
- [ ] Verify: `python3.9 --version` shows Python 3.9.x
- [ ] Run: `sudo apt install -y build-essential git curl wget`

---

## Phase 4: Set Up Pose Service (5 minutes)

- [ ] Run: `mkdir -p /home/user/pose-service`
- [ ] Run: `cd /home/user/pose-service`
- [ ] Run: `python3.9 -m venv venv`
- [ ] Run: `source venv/bin/activate`
- [ ] Run: `pip install --upgrade pip setuptools wheel`

---

## Phase 5: Install Dependencies (10-20 minutes)

- [ ] From Windows PowerShell, copy requirements file:
  ```powershell
  Copy-Item "SnowboardingExplained/backend/pose-service/requirements.txt" -Destination "\\wsl$\Ubuntu\home\user\pose-service\"
  ```
- [ ] In Ubuntu, run: `pip install -r requirements.txt`
- [ ] Wait for installation (this takes time!)
- [ ] Verify: `python -c "import torch; print(torch.__version__)"`

---

## Phase 6: Copy Code (5 minutes)

- [ ] From Windows PowerShell, copy Python files:
  ```powershell
  Copy-Item "SnowboardingExplained/backend/pose-service/*.py" -Destination "\\wsl$\Ubuntu\home\user\pose-service\"
  Copy-Item "SnowboardingExplained/backend/pose-service/4D-Humans" -Destination "\\wsl$\Ubuntu\home\user\pose-service\" -Recurse
  ```
- [ ] In Ubuntu, verify: `ls -la /home/user/pose-service/`
- [ ] Check that you see: `app.py`, `hybrid_pose_detector.py`, `crop_projection.py`, `4D-Humans/`

---

## Phase 7: Test Pose Service (5 minutes)

- [ ] In Ubuntu, run: `cd /home/user/pose-service && source venv/bin/activate`
- [ ] Run: `python -c "from hybrid_pose_detector import HybridPoseDetector; print('✓ Imports work')"`
- [ ] Run: `python app.py`
- [ ] Wait for startup (may take 2-3 minutes on first run)
- [ ] In another terminal, run: `curl http://localhost:5000/health`
- [ ] Verify you see: `{"status": "healthy"}`
- [ ] Stop service: Press `Ctrl+C`

---

## Phase 8: Configure Kiro (2 minutes)

- [ ] Open `backend/mcp-server/src/config/wsl.config.ts`
- [ ] Verify paths match your setup (if username is different, update `/home/user/` to `/home/YOUR_USERNAME/`)
- [ ] Save file

---

## Phase 9: Rebuild MCP Server (5 minutes)

- [ ] From Windows PowerShell, run:
  ```powershell
  cd SnowboardingExplained/backend/mcp-server
  npm install
  npm run build
  ```
- [ ] Wait for build to complete

---

## Phase 10: Start All Services (5 minutes)

Open 4 separate terminals:

**Terminal 1 - Pose Service (WSL)**:
```powershell
wsl
cd /home/user/pose-service
source venv/bin/activate
python app.py
```
- [ ] Wait for startup message: `Running on http://localhost:5000`

**Terminal 2 - Backend Server (Windows)**:
```powershell
cd SnowboardingExplained
./start-backend.bat
```
- [ ] Wait for startup message: `Server running on port 3001`

**Terminal 3 - Mobile App (Windows)**:
```powershell
cd SnowboardingExplained/backend/mobile
npm start
```
- [ ] Wait for Expo to start

**Terminal 4 - MCP Server (Windows)**:
```powershell
cd SnowboardingExplained/backend/mcp-server
npm run dev
```
- [ ] Wait for startup message: `MCP Server initialized`

---

## Phase 11: Test WSL-Kiro Integration (5 minutes)

In Kiro, try these commands:

- [ ] `Run the command: echo "WSL available"`
  - Should return: `WSL available`

- [ ] `List the files in /home/user/pose-service`
  - Should show: `app.py`, `hybrid_pose_detector.py`, etc.

- [ ] `Read /home/user/pose-service/app.py`
  - Should show the Python code

- [ ] `Is the pose service running?`
  - Should return: `status: running, healthy: true`

- [ ] `Show me the last 10 lines of the pose service logs`
  - Should show recent logs

---

## ✅ All Done!

You now have:
- ✅ WSL2 with Ubuntu running
- ✅ Python environment set up
- ✅ Pose service running on WSL
- ✅ Backend server running on Windows
- ✅ Mobile app running on Windows
- ✅ MCP server running on Windows
- ✅ Kiro can access and manage files on WSL

---

## Next Steps

1. **Edit Python files on WSL from Kiro**
   - Use `readWslFile` to read files
   - Make changes
   - Use `writeWslFile` to save changes

2. **Run tests on WSL from Kiro**
   - Use `runWslPython` to run test scripts
   - Check output for results

3. **Manage pose service from Kiro**
   - Use `startPoseService` to start
   - Use `stopPoseService` to stop
   - Use `getPoseServiceStatus` to check status
   - Use `getPoseServiceLogs` to view logs

4. **Set up ViTDet (optional)**
   - Use Kiro to run setup commands on WSL
   - Install detectron2
   - Download ViTDet model

---

## Troubleshooting Quick Links

- WSL won't install? → See "WSL Command Not Found" in WSL_SETUP_GUIDE.md
- Ubuntu won't start? → See "Ubuntu Won't Start" in WSL_SETUP_GUIDE.md
- Python not found? → See "Python Not Found in WSL" in WSL_SETUP_GUIDE.md
- Pip install fails? → See "Pip Install Fails" in WSL_SETUP_GUIDE.md
- Pose service won't start? → See "Pose Service Won't Start" in WSL_SETUP_GUIDE.md
- Kiro can't connect? → See "Kiro Can't Connect to WSL" in WSL_SETUP_GUIDE.md

---

**Estimated Total Time**: 30-45 minutes

**Status**: Ready to start! Follow the checklist above step by step.
