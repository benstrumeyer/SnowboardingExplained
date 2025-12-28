# Docker for Beginners - Simple Explanation

## What is Docker?

Think of Docker like a **shipping container for software**. Instead of shipping physical goods, you're shipping your entire application with everything it needs to run.

**Without Docker (the old way - WSL):**
- You install Python on your computer
- You install Node.js on your computer
- You install MongoDB on your computer
- You manually start each service in different terminals
- If something breaks, you have to debug your entire system

**With Docker (the new way):**
- Everything is packaged in isolated containers
- Each service runs in its own container
- One command starts everything
- If something breaks, you just delete the container and start fresh
- It works the same on your computer, your friend's computer, and production servers

## Key Docker Concepts

### 1. **Image** = Recipe/Blueprint
An image is like a recipe for a cake. It contains all the instructions needed to create a container.

Example: `nvidia/cuda:12.1.1-runtime-ubuntu22.04` is an image that has Ubuntu + CUDA pre-installed.

### 2. **Container** = Running Instance
A container is like a baked cake. It's the actual running application.

When you run an image, it creates a container. You can have multiple containers from the same image.

### 3. **docker-compose** = Orchestrator
docker-compose is like a conductor for an orchestra. It manages multiple containers and makes them work together.

Instead of starting 5 services manually, docker-compose starts them all with one command.

## Your Setup Explained

You have 5 services that need to run together:

```
┌─────────────────────────────────────────┐
│         docker-compose.yml              │
│  (The conductor's sheet music)          │
├─────────────────────────────────────────┤
│                                         │
│  1. Pose Service (GPU)                  │
│     - Runs Python + 4D-Humans           │
│     - Uses GPU                          │
│     - Port 5000                         │
│                                         │
│  2. Backend API                         │
│     - Runs Node.js                      │
│     - Port 3001                         │
│                                         │
│  3. Frontend                            │
│     - Runs React                        │
│     - Port 5173                         │
│                                         │
│  4. Redis                               │
│     - Cache database                    │
│     - Port 6379                         │
│                                         │
│  5. MongoDB                             │
│     - Main database                     │
│     - Port 27017                        │
│                                         │
└─────────────────────────────────────────┘
```

## Step-by-Step: How to Use Docker

### Step 1: Open PowerShell

Press `Win + R`, type `powershell`, and press Enter.

### Step 2: Navigate to Your Project

```powershell
cd C:\Users\benja\repos\SnowboardingExplained
```

(Replace `benja` with your username if different)

### Step 3: Start All Services

```powershell
docker-compose up -d
```

**What this does:**
- `-d` means "detached" (run in background)
- Reads `docker-compose.yml`
- Builds images (first time only, takes ~10-15 minutes)
- Starts all 5 containers
- Returns to your prompt

**First time output:**
```
Building pose-service
Building backend-api
Building frontend
Pulling redis
Pulling mongodb
Creating snowboard-pose-service
Creating snowboard-backend-api
Creating snowboard-frontend
Creating snowboard-redis
Creating snowboard-mongodb
```

### Step 4: Check Status

```powershell
docker-compose ps
```

**Expected output:**
```
NAME                    STATUS              PORTS
snowboard-pose-service  Up (healthy)        0.0.0.0:5000->5000/tcp
snowboard-backend-api   Up (healthy)        0.0.0.0:3001->3001/tcp
snowboard-frontend      Up                  0.0.0.0:5173->5173/tcp
snowboard-redis         Up (healthy)        0.0.0.0:6379->6379/tcp
snowboard-mongodb       Up (healthy)        0.0.0.0:27017->27017/tcp
```

If you see "Up", everything is running! ✅

### Step 5: View Logs (Debugging)

To see what's happening inside the containers:

```powershell
# See all logs
docker-compose logs -f

# See logs from one service
docker-compose logs -f pose-service

# See last 50 lines
docker-compose logs --tail=50
```

Press `Ctrl+C` to stop viewing logs.

### Step 6: Access Your Services

Open your browser and go to:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Pose Service**: http://localhost:5000

### Step 7: Stop Everything

```powershell
docker-compose down
```

This stops and removes all containers (but keeps your data).

## Common Commands

### Check if Docker is Running

```powershell
docker ps
```

If you see a table, Docker is running. If you get an error, start Docker Desktop.

### Restart One Service

```powershell
docker-compose restart pose-service
```

### Run a Command Inside a Container

```powershell
# Open bash terminal in pose-service
docker-compose exec pose-service bash

# Check GPU
docker-compose exec pose-service nvidia-smi

# Exit bash
exit
```

### View Container Logs

```powershell
# Follow logs in real-time
docker-compose logs -f backend-api

# View last 100 lines
docker-compose logs --tail=100 backend-api
```

### Delete Everything and Start Fresh

```powershell
# Stop and remove containers
docker-compose down

# Remove images too
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Troubleshooting

### Problem: "Docker daemon is not running"

**Solution:** Open Docker Desktop from your Start menu and wait for it to start.

### Problem: "Port 5000 is already in use"

**Solution:** Another service is using that port. Either:
1. Stop the other service
2. Edit `docker-compose.yml` and change the port:
   ```yaml
   ports:
     - "5001:5000"  # Changed from 5000 to 5001
   ```

### Problem: Services won't start

**Solution:** Check the logs:
```powershell
docker-compose logs pose-service
```

Look for error messages and search for solutions.

### Problem: "Out of memory" error

**Solution:** Docker ran out of memory. Either:
1. Close other applications
2. Increase Docker's memory limit in Docker Desktop settings
3. Reduce batch size in your code

### Problem: GPU not detected

**Solution:** Check if nvidia-docker is installed:
```powershell
docker run --rm --gpus all nvidia/cuda:12.1.1-runtime-ubuntu22.04 nvidia-smi
```

If this fails, you need to install nvidia-docker.

## Development Workflow

### Making Code Changes

1. Edit your code in VS Code
2. Changes are automatically reflected in containers (code is mounted as volumes)
3. For Python: restart the service if needed
4. For Node.js/React: usually hot-reloads automatically

### Example: Changing Python Code

```powershell
# Edit your Python file in VS Code
# Then restart the service
docker-compose restart pose-service

# View logs to see changes
docker-compose logs -f pose-service
```

### Example: Changing React Code

```powershell
# Edit your React file in VS Code
# Changes appear automatically in browser (hot reload)
# Just refresh the page if needed
```

## Understanding the Files

### `docker-compose.yml`
The main configuration file. It defines:
- What services to run
- What ports they use
- What volumes to mount
- Environment variables
- Dependencies between services

### `.env`
Environment variables used by docker-compose:
- `CUDA_VISIBLE_DEVICES=0` - Which GPU to use
- `MONGODB_URI=...` - Database connection string
- `REDIS_URL=...` - Cache connection string

### `Dockerfile` (in each service folder)
Instructions for building an image:
- What base image to start with
- What dependencies to install
- What command to run

### `.dockerignore`
Like `.gitignore` but for Docker. Tells Docker which files to ignore when building images.

## Real-World Analogy

**Without Docker:**
- You're a chef who has to set up the entire kitchen every time you cook
- You need to install ovens, stoves, refrigerators
- If something breaks, you have to fix the whole kitchen

**With Docker:**
- You have pre-built kitchens (images)
- You just turn them on (create containers)
- If something breaks, you throw away the kitchen and get a new one
- All kitchens are identical, so recipes work everywhere

## Next Steps

1. **Start Docker Desktop** (if not already running)
2. **Open PowerShell** in your project directory
3. **Run**: `docker-compose up -d`
4. **Check**: `docker-compose ps`
5. **View logs**: `docker-compose logs -f`
6. **Open browser**: http://localhost:5173

That's it! You now have all 5 services running.

## Quick Reference Card

```powershell
# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Restart one service
docker-compose restart pose-service

# Run command in container
docker-compose exec pose-service bash

# View GPU
docker-compose exec pose-service nvidia-smi

# Delete everything and start fresh
docker-compose down --rmi all
docker-compose up -d
```

## Why This is Better Than WSL

| Feature | WSL | Docker |
|---------|-----|--------|
| GPU Crashes | ❌ Yes (E_UNEXPECTED) | ✅ No |
| Start Services | ❌ 5 manual terminals | ✅ One command |
| View Logs | ❌ Scattered | ✅ Centralized |
| Isolation | ❌ Shared system | ✅ Isolated containers |
| Reproducibility | ❌ Environment-dependent | ✅ Same everywhere |
| Debugging | ❌ WSL-specific issues | ✅ Standard Docker tools |

## Still Confused?

Think of it this way:

- **Image** = A frozen snapshot of a working system
- **Container** = A running copy of that snapshot
- **docker-compose** = A way to run multiple containers together
- **Volume** = A folder shared between your computer and the container
- **Port** = A way to access the container from your computer

That's really all you need to know to get started!
