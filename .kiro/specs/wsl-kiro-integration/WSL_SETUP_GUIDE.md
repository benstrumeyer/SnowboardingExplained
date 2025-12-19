# WSL Setup Guide - Complete Installation

**Goal**: Get WSL2 with Ubuntu running, then set up the pose-service with ViTDet and HMR2.

---

## Step 1: Install WSL2

### Check if WSL is Already Installed

Open PowerShell as Administrator and run:
```powershell
wsl --list --verbose
```

If you see output with distributions, WSL is installed. Skip to Step 2.

If you get "command not found", continue below.

### Install WSL2

Open PowerShell as Administrator and run:
```powershell
wsl --install
```

This will:
- Enable WSL2 feature
- Install Ubuntu (default distribution)
- Download and install Ubuntu

**Note**: This may take 5-10 minutes and require a restart.

### Restart Your Computer

After installation completes, restart Windows.

### Verify Installation

After restart, open PowerShell and run:
```powershell
wsl --list --verbose
```

You should see:
```
NAME      STATE           VERSION
Ubuntu    Running         2
```

---

## Step 2: Set Up Ubuntu

### Launch Ubuntu

Open PowerShell and run:
```powershell
wsl
```

Or search for "Ubuntu" in Windows Start menu and click it.

### Create User Account

On first launch, Ubuntu will ask for:
- Username (e.g., `user`)
- Password (e.g., `password123`)

**Remember these credentials** - you'll need them for `sudo` commands.

### Update Ubuntu

Run these commands in Ubuntu:
```bash
sudo apt update
sudo apt upgrade -y
```

This updates the package manager and system packages.

---

## Step 3: Install Python and Dependencies

### Install Python 3.9+

```bash
sudo apt install -y python3.9 python3.9-venv python3.9-dev python3-pip
```

### Verify Python Installation

```bash
python3.9 --version
```

Should output: `Python 3.9.x`

### Install Build Tools

```bash
sudo apt install -y build-essential git curl wget
```

---

## Step 4: Set Up Pose Service Directory

### Create Directory Structure

```bash
mkdir -p /home/user/pose-service
cd /home/user/pose-service
```

### Create Python Virtual Environment

```bash
python3.9 -m venv venv
source venv/bin/activate
```

You should see `(venv)` in your prompt.

### Upgrade pip

```bash
pip install --upgrade pip setuptools wheel
```

---

## Step 5: Install Pose Service Dependencies

### Copy Requirements File

From Windows PowerShell, copy the requirements file:
```powershell
Copy-Item "SnowboardingExplained/backend/pose-service/requirements.txt" -Destination "\\wsl$\Ubuntu\home\user\pose-service\"
```

### Install Requirements

In Ubuntu (with venv activated):
```bash
cd /home/user/pose-service
pip install -r requirements.txt
```

**Note**: This may take 10-20 minutes as it downloads and compiles packages.

### Verify Installation

```bash
python -c "import torch; print(torch.__version__)"
```

Should output a PyTorch version.

---

## Step 6: Copy Pose Service Code

### Copy Python Files

From Windows PowerShell:
```powershell
Copy-Item "SnowboardingExplained/backend/pose-service/*.py" -Destination "\\wsl$\Ubuntu\home\user\pose-service\"
Copy-Item "SnowboardingExplained/backend/pose-service/4D-Humans" -Destination "\\wsl$\Ubuntu\home\user\pose-service\" -Recurse
```

### Verify Files

In Ubuntu:
```bash
ls -la /home/user/pose-service/
```

You should see:
- `app.py`
- `hybrid_pose_detector.py`
- `crop_projection.py`
- `debug_visualization.py`
- `4D-Humans/` directory
- `venv/` directory

---

## Step 7: Test Pose Service

### Activate Virtual Environment

```bash
cd /home/user/pose-service
source venv/bin/activate
```

### Test Python Imports

```bash
python -c "from hybrid_pose_detector import HybridPoseDetector; print('✓ Imports work')"
```

### Start Pose Service

```bash
python app.py
```

You should see:
```
[POSE] PyTorch X.X.X, CUDA: True/False
[POSE] HMR2 available
 * Running on http://localhost:5000
```

**Note**: First run may take 2-3 minutes to download HMR2 model (~500MB).

### Test Service

In another Ubuntu terminal:
```bash
curl http://localhost:5000/health
```

Should return: `{"status": "healthy"}`

### Stop Service

Press `Ctrl+C` in the terminal running the service.

---

## Step 8: Configure Kiro WSL Tools

### Update WSL Config (if needed)

Edit `backend/mcp-server/src/config/wsl.config.ts` and verify:
```typescript
poseService: {
  root: '/home/user/pose-service',
  app: '/home/user/pose-service/app.py',
  venv: '/home/user/pose-service/venv',
  python: '/home/user/pose-service/venv/bin/python',
  port: 5000,
  host: 'localhost',
}
```

If your username is different, update `/home/user/` to `/home/YOUR_USERNAME/`.

### Rebuild MCP Server

In Windows PowerShell:
```powershell
cd SnowboardingExplained/backend/mcp-server
npm install
npm run build
```

---

## Step 9: Start All Services

### Terminal 1: Pose Service (WSL)

```powershell
wsl
cd /home/user/pose-service
source venv/bin/activate
python app.py
```

### Terminal 2: Backend Server (Windows)

```powershell
cd SnowboardingExplained
./start-backend.bat
```

### Terminal 3: Mobile App (Windows)

```powershell
cd SnowboardingExplained/backend/mobile
npm start
```

### Terminal 4: MCP Server (Windows)

```powershell
cd SnowboardingExplained/backend/mcp-server
npm run dev
```

---

## Step 10: Test WSL-Kiro Integration

### In Kiro, try these commands:

**Check if WSL is available**:
```
Run the command: echo "WSL available"
```

**List files on WSL**:
```
List the files in /home/user/pose-service
```

**Read a file**:
```
Read /home/user/pose-service/app.py
```

**Check service status**:
```
Is the pose service running?
```

**Start service from Kiro**:
```
Start the pose service
```

---

## Troubleshooting

### WSL Command Not Found

**Problem**: `wsl: command not found`

**Solution**:
1. Ensure WSL2 is installed: `wsl --install`
2. Restart Windows
3. Try again

### Ubuntu Won't Start

**Problem**: Ubuntu terminal closes immediately

**Solution**:
1. Open PowerShell as Administrator
2. Run: `wsl --set-default-version 2`
3. Run: `wsl --install -d Ubuntu`
4. Try again

### Python Not Found in WSL

**Problem**: `python3.9: command not found`

**Solution**:
```bash
sudo apt install -y python3.9
```

### Pip Install Fails

**Problem**: `pip: command not found` or permission errors

**Solution**:
```bash
sudo apt install -y python3-pip
pip install --upgrade pip
```

### Pose Service Won't Start

**Problem**: `ModuleNotFoundError` or import errors

**Solution**:
1. Verify venv is activated: `which python` should show `/home/user/pose-service/venv/bin/python`
2. Reinstall requirements: `pip install -r requirements.txt`
3. Check logs for specific errors

### Kiro Can't Connect to WSL

**Problem**: WSL tools return errors

**Solution**:
1. Verify WSL is running: `wsl --list --verbose`
2. Test manually: `wsl echo "test"`
3. Check MCP server logs for errors
4. Verify paths in `wsl.config.ts` match your setup

### Port Already in Use

**Problem**: `Address already in use` error

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

---

## Quick Reference

### Common WSL Commands

```bash
# List distributions
wsl --list --verbose

# Launch Ubuntu
wsl

# Shutdown WSL
wsl --shutdown

# Access files from Windows
\\wsl$\Ubuntu\home\user\pose-service

# Copy file to WSL
Copy-Item "C:\path\file.txt" -Destination "\\wsl$\Ubuntu\home\user\"
```

### Common Ubuntu Commands

```bash
# Activate venv
source /home/user/pose-service/venv/bin/activate

# Deactivate venv
deactivate

# Start pose service
python /home/user/pose-service/app.py

# Check service status
curl http://localhost:5000/health

# View logs
tail -f /tmp/pose-service.log
```

---

## Next Steps

1. ✅ Install WSL2 and Ubuntu
2. ✅ Set up Python environment
3. ✅ Install dependencies
4. ✅ Copy pose service code
5. ✅ Test pose service
6. ✅ Configure Kiro
7. ✅ Start all services
8. ✅ Test WSL-Kiro integration
9. Use Kiro to edit and test Python files on WSL
10. Set up ViTDet (if needed)

---

## Support

If you get stuck:
1. Check the troubleshooting section above
2. Review the error message carefully
3. Check WSL logs: `wsl --status`
4. Try restarting WSL: `wsl --shutdown`
5. Ask for help with the specific error

---

**Estimated Time**: 30-45 minutes total (mostly waiting for downloads)

**Status**: Ready to follow this guide!
