# Pose Overlay Viewer - Setup & Deployment

## Prerequisites

- Node.js 18+
- Python 3.10+
- FFmpeg (for video frame extraction)
- 8GB+ RAM (for 4D-Humans model)

## Development Setup

### 1. Install Dependencies

**Backend**
```bash
cd SnowboardingExplained/backend
npm install
```

**Frontend**
```bash
cd SnowboardingExplained/backend/web
npm install
```

**Pose Service**
```bash
cd SnowboardingExplained/backend/pose-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

**Backend** - Create `.env.local`:
```env
PORT=3001
POSE_SERVICE_URL=http://localhost:5000
NODE_ENV=development
```

**Frontend** - Create `.env`:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Start Services

**Terminal 1 - Pose Service**
```bash
cd SnowboardingExplained/backend/pose-service
source venv/bin/activate
python app.py
# Runs on http://localhost:5000
```

**Terminal 2 - Backend API**
```bash
cd SnowboardingExplained/backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 3 - Frontend**
```bash
cd SnowboardingExplained/backend/web
npm run dev
# Runs on http://localhost:5173
```

### 4. Verify Setup

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check pose service
curl http://localhost:5000/health
```

## Production Deployment

### Docker Setup

**Backend Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile**
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables

**Backend Production**
```env
PORT=3001
POSE_SERVICE_URL=https://pose-service.example.com
NODE_ENV=production
LOG_LEVEL=info
```

**Frontend Production**
```env
VITE_API_URL=https://api.example.com
```

### Deployment Steps

1. **Build Frontend**
   ```bash
   cd backend/web
   npm run build
   # Output: dist/
   ```

2. **Deploy to CDN or Static Host**
   ```bash
   # Upload dist/ to S3, Vercel, Netlify, etc.
   ```

3. **Deploy Backend**
   ```bash
   # Push Docker image to registry
   docker build -t snowboarding-api:latest .
   docker push registry.example.com/snowboarding-api:latest
   
   # Deploy to Kubernetes, ECS, etc.
   ```

4. **Deploy Pose Service**
   ```bash
   # Requires GPU for optimal performance
   # Deploy to dedicated GPU instance
   ```

## Performance Tuning

### Backend Optimization

- **Mesh Data Caching**: Implement Redis for mesh data storage
- **Database**: Replace in-memory meshDataStore with PostgreSQL
- **Compression**: Gzip mesh data responses
- **CDN**: Serve static assets from CDN

### Frontend Optimization

- **Code Splitting**: Lazy load Three.js and mesh components
- **Compression**: Enable gzip in production
- **Caching**: Set appropriate cache headers
- **Monitoring**: Add error tracking (Sentry, etc.)

### Pose Service Optimization

- **GPU Acceleration**: Use CUDA for faster processing
- **Batch Processing**: Process multiple frames in parallel
- **Model Caching**: Keep model in memory between requests
- **Load Balancing**: Run multiple instances behind load balancer

## Monitoring & Logging

### Backend Logs

```bash
# View logs
tail -f logs/app.log

# Log levels: error, warn, info, debug
```

### Metrics to Monitor

- API response times
- Video upload success rate
- Mesh data retrieval latency
- Pose service availability
- Memory usage
- CPU usage

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Pose service health
curl http://localhost:5000/health
```

## Troubleshooting

### Common Issues

**"Cannot find module 'next'"**
- Backend is using Express, not Next.js
- Ensure you're running `npm run dev` from backend directory

**"Pose service connection refused"**
- Verify pose service is running on port 5000
- Check POSE_SERVICE_URL environment variable
- Ensure firewall allows connection

**"Video upload timeout"**
- Increase timeout in VideoUploadModal.tsx (currently 5 minutes)
- Check network connectivity
- Verify video file is valid

**"Mesh data not found"**
- Check backend logs for processing errors
- Verify pose service is responding
- Ensure videoId matches between upload and retrieval

### Debug Mode

Enable detailed logging:

```bash
# Backend
DEBUG=* npm run dev

# Frontend
VITE_DEBUG=true npm run dev
```

## Scaling Considerations

### Horizontal Scaling

- **Backend**: Stateless, can run multiple instances behind load balancer
- **Pose Service**: GPU-bound, requires dedicated instances
- **Frontend**: Static assets, serve from CDN

### Vertical Scaling

- **Backend**: Increase Node.js heap size for large mesh data
- **Pose Service**: Requires GPU with sufficient VRAM (8GB+ recommended)
- **Frontend**: No special requirements

### Data Persistence

Current implementation uses in-memory storage. For production:

1. **Option 1: Database**
   - Store mesh data in PostgreSQL
   - Implement TTL for old uploads

2. **Option 2: Object Storage**
   - Store mesh data in S3/GCS
   - Use signed URLs for retrieval

3. **Option 3: Hybrid**
   - Cache recent uploads in memory
   - Archive old uploads to database/storage

## Security Considerations

- **File Upload**: Validate video file type and size
- **CORS**: Configure appropriate CORS headers
- **Rate Limiting**: Implement rate limiting on API endpoints
- **Authentication**: Add user authentication for production
- **HTTPS**: Use HTTPS in production
- **Input Validation**: Validate all API inputs

## Backup & Recovery

- **Mesh Data**: Implement automated backups if using database
- **Configuration**: Version control all configuration files
- **Logs**: Archive logs for audit trail
- **Disaster Recovery**: Document recovery procedures
