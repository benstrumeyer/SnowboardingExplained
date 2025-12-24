# MongoDB Setup Guide

Docker-based MongoDB setup for development.

**Connection String:**
```
mongodb://admin:password@localhost:27017/meshes?authSource=admin
```

**Collections:**
- `mesh_data` - Video metadata
- `mesh_frames` - Individual frame data

See backend/.env.docker for configuration.
