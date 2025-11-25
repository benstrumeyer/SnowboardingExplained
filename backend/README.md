# Snowboarding Coach API

Vercel serverless backend for the Snowboarding Coach mobile app.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` with your API keys (already done)

3. Run locally:
```bash
npm run dev
```

4. Test the API:
```bash
curl http://localhost:3000/api/health
```

## API Endpoints

### POST /api/chat
Main coaching endpoint

**Request:**
```json
{
  "context": {
    "trick": "backside 180",
    "featureSize": "medium",
    "issues": "not getting enough rotation"
  },
  "sessionId": "test-123"
}
```

**Response:**
```json
{
  "response": "Hey! Let's work on that backside 180...",
  "videos": [
    {
      "videoId": "test-001",
      "title": "How to Backside 180",
      "thumbnail": "...",
      "timestamp": 0,
      "quote": "...",
      "url": "..."
    }
  ],
  "cached": false
}
```

### GET /api/health
Health check endpoint

## Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Add environment variables in Vercel dashboard:
   - GEMINI_API_KEY
   - PINECONE_API_KEY
   - PINECONE_INDEX

## Testing

Test with curl:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "trick": "backside 180",
      "featureSize": "medium",
      "issues": "not getting enough rotation"
    },
    "sessionId": "test-123"
  }'
```
