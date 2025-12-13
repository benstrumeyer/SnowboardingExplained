# ngrok Setup Guide

## Step 1: Add your auth token
Run this command once:
```
"C:\Program Files\ngrok.exe" config add-authtoken 36maf5fJLJFbIVeC1Y7Tzw02lvp_233JUqyWGAaw1MUUWuKRe
```

## Step 2: Start ngrok in a separate terminal
Open a new CMD/PowerShell window and run:
```
"C:\Program Files\ngrok.exe" http 3001
```

You'll see output like:
```
Session Status                online
Account                       [your account]
Version                        3.x.x
Region                         us
Forwarding                     https://abc123.ngrok.io -> http://localhost:3001
```

Copy the `https://abc123.ngrok.io` URL.

## Step 3: Update your config
Edit `backend/mobile/src/config.ts` and replace the API_URL:
```typescript
export const API_URL = 'https://abc123.ngrok.io';  // Replace with your ngrok URL
```

## Step 4: Start your mobile app
In another terminal, run:
```
cd backend/mobile
npm start
```

That's it! Your mobile app will now use the ngrok tunnel to reach your backend.
