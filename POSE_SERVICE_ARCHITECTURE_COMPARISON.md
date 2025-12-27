# Pose Service Architecture: Old vs New

## Overview
This document compares the previous pose service architecture with the current 4D-Humans + PHALP integration setup, including directory structures in both Windows and WSL.

---

## OLD ARCHITECTURE (Process Pool Based)

### Windows Directory Structure
```
C:\Users\benja\repos\SnowboardingExplained\
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── pythonPoseService.ts          # Python process spawner
│   │   │   ├── processPoolManager.ts         # Pool management
│   │   │   └── posePoolConfig.ts             # Configuration
│   │   ├── api/
│   │   │   └── pose.ts                       # HTTP endpoint
│   │   └── server.ts                         # Express server
│   └── pose-service/                         # Python code (Windows copy)
│       ├── 4D-Humans/                        # 4D-Humans repo
│       ├── venv/                             # Virtual environment
│       └── *.py files                        # Various wrappers
└── package.json
```

### WSL Directory Structure
```
/home/ben/pose-service/                       # WSL home directory
├── 4D-Humans/                                # 4D-Humans repo
│   ├── venv/                                 # Virtual environment
│   ├── hmr2/                                 # HMR2 model code
│   ├── phalp/                                # PHALP tracking code
│   └── setup.py
├── *.py files                                # Various wrappers
└── models/                                   # Downloaded models
```

### How It Worked
1. **Node.js Backend** spawns Python processes via `child_process.spawn()`
2. **Process Pool** maintains multiple Python processes ready to handle requests
3. **Stdin/Stdout Communication** - JSON sent to stdin, results read from stdout
4. **Blocking Operations** - Each request blocks a process until completion
5. **Model Loading** - Models loaded once per process at startup

### Issues
- Frame loss due to process pool bottlenecks
- Synchronization problems between video and mesh data
- Complex inter-process communication
- Difficult to debug and maintain
- Models loaded multiple times (once per process)

---

## NEW ARCHITECTURE (External HTTP Service)

### Windows Directory Structure
```
C:\Users\benja\repos\SnowboardingExplained\
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── poseServiceHttpWrapper.ts     # HTTP client (NEW)
│   │   │   └── (old process pool files removed)
│   │   ├── api/
│   │   │   └── pose.ts                       # HTTP endpoint (updated)
│   │   └── server.ts                         # Express server
│   ├── pose-service/                         # Symlink/reference to WSL
│   │   ├── 4D-Humans/
│   │   │   ├── venv/                         # Python venv
│   │   │   ├── hmr2/
│   │   │   ├── phalp/
│   │   │   └── setup.py
│   │   ├── flask_wrapper_minimal_safe.py     # Flask HTTP server (NEW)
│   │   ├── hmr2_loader.py                    # HMR2 loader
│   │   ├── basicmodel_m_lbs_10_207_0_v1.1.0.pkl  # Male SMPL model
│   │   └── requirements.txt
│   └── package.json
└── (other files)
```

### WSL Directory Structure
```
/home/ben/pose-service/                       # Main service directory
├── 4D-Humans/                                # 4D-Humans repo
│   ├── venv/                                 # Python virtual environment
│   │   ├── bin/
│   │   │   ├── python                        # Python 3.12
│   │   │   └── activate                      # Activation script
│   │   └── lib/python3.12/site-packages/     # Installed packages
│   │       ├── torch/                        # PyTorch 2.9.1
│   │       ├── torchvision/
│   │       ├── pytorch_lightning/
│   │       ├── omegaconf/                    # OmegaConf config
│   │       ├── flask/                        # Flask HTTP framework
│   │       ├── smplx/                        # SMPL-X model
│   │       ├── phalp/                        # PHALP tracking
│   │       ├── chumpy/                       # SMPL unpickling
│   │       └── (other dependencies)
│   ├── hmr2/                                 # HMR2 model code
│   ├── phalp/                                # PHALP tracking code
│   ├── setup.py                              # Package setup
│   └── (other 4D-Humans files)
├── flask_wrapper_minimal_safe.py             # Flask HTTP server
├── hmr2_loader.py                            # HMR2 initialization
├── basicmodel_m_lbs_10_207_0_v1.1.0.pkl      # Male SMPL model
└── (cache directories for downloaded models)
```

### How It Works
1. **Flask HTTP Server** runs in WSL as a separate process
2. **Node.js Backend** makes HTTP requests to `http://localhost:5000`
3. **Stateful Service** - Models loaded once at startup, reused for all requests
4. **Non-blocking** - HTTP requests are async, no process pool needed
5. **Clean Separation** - Python service completely independent from Node.js

### Advantages
- Single model instance shared across all requests
- No inter-process communication overhead
- Easier to debug (separate terminal for Flask server)
- Better resource utilization
- Cleaner architecture
- Can be deployed independently

---

## DIRECTORY MAPPING: Windows ↔ WSL

### Path Equivalents

| Windows Path | WSL Path | Purpose |
|---|---|---|
| `C:\Users\benja\repos\SnowboardingExplained\backend\pose-service` | `/mnt/c/Users/benja/repos/SnowboardingExplained/backend/pose-service` | Shared via Windows mount |
| `C:\Users\benja\repos\SnowboardingExplained\backend\pose-service` | `/home/ben/pose-service` | Symlink/native WSL location |
| `C:\Users\benja\repos\SnowboardingExplained\backend\pose-service\4D-Humans` | `/home/ben/pose-service/4D-Humans` | 4D-Humans repository |
| `C:\Users\benja\repos\SnowboardingExplained\flask_wrapper_minimal_safe.py` | `/home/ben/pose-service/flask_wrapper_minimal_safe.py` | Flask wrapper (copied to WSL) |

### Key Difference
- **Old**: Everything in Windows, Python processes spawned from Node.js
- **New**: Python service runs natively in WSL, Node.js communicates via HTTP

---

## STARTUP PROCESS

### Old (Process Pool)
```
1. Node.js starts
2. ProcessPoolManager initializes
3. Spawns N Python processes
4. Each process loads models (slow, memory intensive)
5. Ready to accept requests
```

### New (HTTP Service)
```
1. Start Flask server in WSL:
   wsl -d Ubuntu bash -c "cd /home/ben/pose-service && \
     source 4D-Humans/venv/bin/activate && \
     python flask_wrapper_minimal_safe.py"

2. Flask server initializes
3. Models loaded once (HMR2 + PHALP)
4. Server listens on http://localhost:5000

5. Node.js starts (separate process)
6. Makes HTTP requests to Flask server
7. Ready to accept requests
```

---

## KEY FILES

### Windows (Node.js Backend)
- `backend/src/services/poseServiceHttpWrapper.ts` - HTTP client for Flask
- `backend/src/api/pose.ts` - Express endpoint that calls Flask
- `backend/src/server.ts` - Main Express server
- `flask_wrapper_minimal_safe.py` - Flask server (copied to WSL)

### WSL (Python Service)
- `/home/ben/pose-service/flask_wrapper_minimal_safe.py` - Flask HTTP server
- `/home/ben/pose-service/hmr2_loader.py` - HMR2 model loader
- `/home/ben/pose-service/4D-Humans/` - 4D-Humans repository
- `/home/ben/pose-service/4D-Humans/venv/` - Python virtual environment

---

## COMMUNICATION FLOW

### Old Architecture
```
Client Request
    ↓
Express Server (Node.js)
    ↓
ProcessPoolManager
    ↓
Python Process (stdin/stdout)
    ↓
HMR2 + PHALP Models
    ↓
Response (stdout)
    ↓
Express Server
    ↓
Client Response
```

### New Architecture
```
Client Request
    ↓
Express Server (Node.js)
    ↓
HTTP Client (poseServiceHttpWrapper.ts)
    ↓
HTTP Request to localhost:5000
    ↓
Flask Server (WSL)
    ↓
HMR2 + PHALP Models (loaded once)
    ↓
HTTP Response (JSON)
    ↓
Express Server
    ↓
Client Response
```

---

## PERFORMANCE IMPLICATIONS

### Old
- **Startup**: Slow (models loaded N times)
- **Memory**: High (N copies of models)
- **Throughput**: Limited by process pool size
- **Latency**: Variable (depends on pool availability)

### New
- **Startup**: Slower initially (one-time model load), then fast
- **Memory**: Lower (single model instance)
- **Throughput**: Limited by Flask server capacity
- **Latency**: More consistent (no process switching)

---

## DEPLOYMENT

### Old
- Everything in Windows
- Python processes spawned from Node.js
- Difficult to scale

### New
- Flask service can run on any machine
- Can be containerized (Docker)
- Can be deployed to cloud
- Node.js and Python service are independent
- Easy to restart service without restarting Node.js

---

## SUMMARY

| Aspect | Old | New |
|---|---|---|
| **Architecture** | Process Pool (in-process) | HTTP Service (out-of-process) |
| **Location** | Windows only | WSL (Python), Windows (Node.js) |
| **Communication** | stdin/stdout | HTTP |
| **Model Loading** | Per process | Once at startup |
| **Scalability** | Limited | Better |
| **Debugging** | Difficult | Easy (separate terminal) |
| **Deployment** | Monolithic | Microservices-ready |
| **Resource Usage** | High (N model copies) | Low (1 model copy) |
