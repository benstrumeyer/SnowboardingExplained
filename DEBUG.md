# Debugging 500 Errors

## Check Vercel Logs (Real-time)

```bash
cd SnowboardingExplained/backend
vercel logs --follow
```

## Check Vercel Dashboard Logs

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click on the latest deployment
4. Click "Functions" tab
5. Click on `/api/chat`
6. View the logs

## Check Mobile App Logs

In your terminal where Expo is running, you should now see detailed logs:
- Request URL
- Request body
- Response status
- Full error details including stack trace

## Test API Directly

Test the API endpoint directly with curl:

```bash
curl -X POST https://snowboarding-explained.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "trick": "backside 180",
      "featureSize": "medium"
    },
    "sessionId": "test-123"
  }'
```

## Common 500 Error Causes

1. **Missing Environment Variables**
   - Check Vercel dashboard → Settings → Environment Variables
   - Make sure GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX are set

2. **Import/Module Errors**
   - TypeScript compilation issues
   - Missing dependencies

3. **Runtime Errors**
   - Pinecone connection issues
   - Gemini API errors
   - Invalid API keys

## Next Steps

1. Run `vercel logs --follow` in one terminal
2. Test your mobile app in another terminal
3. Watch the logs for the actual error message
4. Share the error stack trace for more specific help
