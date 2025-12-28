# Docker Local Development Environment - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Frontend Dev    │  │  Backend API     │                 │
│  │  (npm run dev)   │  │  (Node.js)       │                 │
│  │  Port: 5173      │  │  Port: 3001      │                 │
│  └──────────────────┘  └──────────────────┘                 │
│         │                      │                             │
│         └──────────┬───────────┘                             │
│                    │                                         │
│         ┌──────────▼──────────┐                             │
│         │  Pose Service       │                             │
│         │  (Flask + track.py) │                             │
│         │  Port: 5000         │                             │
│         │  GPU: nvidia0       │                             │
│         └──────────┬──────────┘                             │
│                    │                                         │
│         ┌──────────┴──────────┐                             │
│         │                     │                             │
│    ┌────▼────┐          ┌────▼────┐                        │
│    │  Redis  │          │ MongoDB  │                        │
│    │ Port:   │          │ Port:    │                        │
│    │ 6379    │          │ 27017    │                        │
│    └─────────┘          └──────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │
         │ (Host Machine)
         │
    ┌────▼────────────────┐
    │  GPU (nvidia0)      │
    │  VRAM: 8GB+         │
    └─────────────────────┘
```

## Service Specifications

### 1. Pose Service Container

**Dockerfile: `backend/pose-service/Dockerfile`**

```dockerfile
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/pose-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy pose service code
COPY backend/pose-service/ .

# Create venv (optional, but good practice)
RUN python3 -m venv venv

# Expose Flask port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start Flask wrapper
CMD ["python3", "flask_wrapper_minimal_safe.py"]
```

**Key Points:**
- Uses nvidia/cuda base image for GPU support
- Python 3.10 for compatibility
- Mounts code as volume for development
- Health check via Flask /health endpoint
- Exposes port 5000

### 2. Backend API Container

**Dockerfile: `backend/Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY backend/src ./src
COPY backend/api ./api

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start backend
CMD ["npm", "run", "dev"]
```

**Key Points:**
- Node.js 18 Alpine for small image size
- Mounts code as volume for hot reload
- Health check via /health endpoint
- Exposes port 3001

### 3. Frontend Dev Container

**Dockerfile: `backend/web/Dockerfile.dev`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/web/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY backend/web/src ./src
COPY backend/web/public ./public
COPY backend/web/vite.config.ts ./

# Expose dev server port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

**Key Points:**
- Vite dev server accessible from host
- Hot module replacement enabled
- Mounts code as volume
- Exposes port 5173

### 4. Redis Container

**Configuration:** Standard redis:7-alpine image

**Key Points:**
- No persistence needed for development
- Port 6379 exposed to network
- No authentication required (local dev only)

### 5. MongoDB Container

**Configuration:** Standard mongo:7 image

**Key Points:**
- Root credentials via environment variables
- Port 27017 exposed to network
- Data persisted to named volume
- Initialization script for test data (optional)

## Docker Compose Configuration

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  # Pose Service with GPU support
  pose-service:
    build:
      context: .
      dockerfile: backend/pose-service/Dockerfile
    container_name: snowboard-pose-service
    ports:
      - "5000:5000"
    volumes:
      - ./backend/pose-service:/app
      - ./backend/uploads:/app/uploads
      - pose-models-cache:/app/models
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - FLASK_ENV=development
      - FLASK_DEBUG=1
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - snowboard-network
    depends_on:
      - redis
      - mongodb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Backend API
  backend-api:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: snowboard-backend-api
    ports:
      - "3001:3001"
    volumes:
      - ./backend/src:/app/src
      - ./backend/api:/app/api
      - ./backend/uploads:/app/uploads
    environment:
      - NODE_ENV=development
      - PORT=3001
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/snowboard?authSource=admin
      - POSE_SERVICE_URL=http://pose-service:5000
    networks:
      - snowboard-network
    depends_on:
      - redis
      - mongodb
      - pose-service
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Frontend Dev Server
  frontend:
    build:
      context: .
      dockerfile: backend/web/Dockerfile.dev
    container_name: snowboard-frontend
    ports:
      - "5173:5173"
    volumes:
      - ./backend/web/src:/app/src
      - ./backend/web/public:/app/public
    environment:
      - VITE_API_URL=http://localhost:3001
    networks:
      - snowboard-network
    depends_on:
      - backend-api
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: snowboard-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - snowboard-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # MongoDB
  mongodb:
    image: mongo:7
    container_name: snowboard-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    networks:
      - snowboard-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  snowboard-network:
    driver: bridge

volumes:
  pose-models-cache:
  redis-data:
  mongodb-data:
```

## Environment Configuration

**File: `.env.docker`** (already exists, may need updates)

```env
# Docker Compose Configuration
COMPOSE_PROJECT_NAME=snowboard

# GPU Configuration
CUDA_VISIBLE_DEVICES=0

# Pose Service
POSE_SERVICE_PORT=5000
POSE_SERVICE_URL=http://pose-service:5000

# Backend API
BACKEND_PORT=3001
NODE_ENV=development

# Frontend
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3001

# Redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# MongoDB
MONGODB_PORT=27017
MONGODB_URI=mongodb://admin:password@mongodb:27017/snowboard?authSource=admin
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password

# Logging
LOG_LEVEL=debug
```

## Volume Mounts Strategy

| Service | Mount Path | Host Path | Purpose |
|---------|-----------|----------|---------|
| pose-service | /app | ./backend/pose-service | Code changes |
| pose-service | /app/uploads | ./backend/uploads | Video uploads |
| pose-service | /app/models | pose-models-cache | Model caching |
| backend-api | /app/src | ./backend/src | Code changes |
| backend-api | /app/uploads | ./backend/uploads | Shared uploads |
| frontend | /app/src | ./backend/web/src | Code changes |
| redis | /data | redis-data | Cache persistence |
| mongodb | /data/db | mongodb-data | Database persistence |

## Network Configuration

- **Network Name**: snowboard-network
- **Driver**: bridge
- **Service Discovery**: Docker DNS (service name = hostname)
- **Port Mapping**: Only expose to host what's needed for development

## GPU Configuration

**nvidia-docker Integration:**
- Uses `deploy.resources.reservations.devices` for GPU allocation
- `CUDA_VISIBLE_DEVICES=0` limits to first GPU
- Can be changed via environment variable
- Requires nvidia-docker runtime installed on host

## Logging Strategy

**Log Aggregation:**
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f pose-service

# View last 100 lines
docker-compose logs --tail=100 pose-service

# Follow logs with timestamps
docker-compose logs -f --timestamps
```

**Log Format:**
- All services log to stdout/stderr
- Timestamps included by default
- Service name prefixed by docker-compose
- Structured logging where possible

## Development Workflow

### Starting Services
```bash
# Start all services
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up -d pose-service
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop specific service
docker-compose stop pose-service

# Stop and remove volumes
docker-compose down -v
```

### Restarting Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart pose-service
```

### Viewing Logs
```bash
# Follow all logs
docker-compose logs -f

# Follow pose service logs
docker-compose logs -f pose-service

# View last 50 lines
docker-compose logs --tail=50
```

### Executing Commands
```bash
# Run command in pose service
docker-compose exec pose-service bash

# Run Python command
docker-compose exec pose-service python3 -c "import torch; print(torch.cuda.is_available())"

# Check GPU status
docker-compose exec pose-service nvidia-smi
```

## Health Checks

Each service includes health checks:
- **Interval**: 30 seconds (10s for Redis/MongoDB)
- **Timeout**: 10 seconds (5s for Redis/MongoDB)
- **Retries**: 3 attempts before marking unhealthy
- **Start Period**: 60s for pose-service (model loading), 30s for others

Health status visible via:
```bash
docker-compose ps
```

## Performance Considerations

1. **GPU Memory**: Pose service gets full GPU access
2. **CPU Allocation**: No explicit limits (can be added if needed)
3. **Memory Allocation**: No explicit limits (can be added if needed)
4. **Disk I/O**: Model cache on named volume for persistence
5. **Network**: Bridge network with minimal overhead

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GPU not detected | Check nvidia-docker installation, verify CUDA_VISIBLE_DEVICES |
| Port already in use | Change port mapping in docker-compose.yml |
| Models not loading | Check volume mounts, verify model files exist |
| Services not communicating | Verify network name, check service names in URLs |
| Out of memory | Reduce batch size, add memory limits |
| Slow startup | Increase health check start_period |

## Migration Path from WSL

1. Build Docker images locally
2. Start docker-compose with all services
3. Test video upload pipeline
4. Verify GPU utilization and stability
5. Compare performance with WSL approach
6. Decommission WSL setup once stable
