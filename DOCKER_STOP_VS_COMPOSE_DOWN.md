# Docker Stop vs Docker Compose Down

## What We Just Did

```bash
docker stop $(docker ps -q)      # Stop all running containers
docker container prune -f         # Remove all stopped containers
```

## Comparison

### `docker-compose down`
- **Scope**: Only affects containers defined in the current `docker-compose.yml`
- **What it does**:
  - Stops containers
  - Removes containers
  - Removes networks created by compose
  - **Does NOT** remove volumes (unless you use `-v` flag)
- **Use case**: When you want to cleanly shut down your entire stack
- **Command**: `docker-compose down` or `docker-compose down -v` (with volumes)

### `docker stop` + `docker container prune`
- **Scope**: Affects ALL containers on your system (not just compose ones)
- **What it does**:
  - `docker stop $(docker ps -q)` - Stops all running containers
  - `docker container prune -f` - Removes all stopped containers
- **Use case**: When you want to clean up everything, including orphaned containers
- **More aggressive**: Stops things you might not have started with compose

## Why We Used `docker stop` + `prune`

You had **orphaned containers** from previous runs:
- `silly_jemison` (old backend-api, exited)
- `epic_nightingale` (old redis, still running)
- `ca0e87ce9378` (pose-service, restarting)

These weren't being managed by docker-compose anymore, so `docker-compose down` wouldn't have cleaned them up.

## Best Practice Going Forward

### Option 1: Use docker-compose (Recommended)
```bash
# Start services
docker-compose up -d

# Stop and clean up
docker-compose down -v
```

### Option 2: Use docker commands directly
```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all stopped containers
docker container prune -f

# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f
```

## Current Status

✅ All containers stopped and cleaned
✅ All orphaned containers removed
✅ Ready to rebuild fresh

## Next Steps

1. Rebuild backend with fixed tsconfig.json
2. Test backend
3. Rebuild frontend
4. Test frontend
5. Finally rebuild pose-service (takes longest)
