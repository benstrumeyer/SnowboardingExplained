# How to Get Your Machine's IP Address

## Windows

### Method 1: Command Prompt (Easiest)
1. Press `Win + R`
2. Type `cmd` and press Enter
3. Type: `ipconfig`
4. Look for "IPv4 Address" under your network adapter
5. Copy the address (e.g., `192.168.1.100`)

### Method 2: PowerShell
```powershell
ipconfig
```

### Method 3: Settings
1. Settings → Network & Internet → WiFi
2. Click your network name
3. Scroll down to "IPv4 address"

## Mac

### Method 1: Terminal (Easiest)
1. Open Terminal (Cmd + Space, type "Terminal")
2. Type: `ifconfig | grep "inet "`
3. Look for `inet 192.168.x.x` (not 127.0.0.1)
4. Copy that address

### Method 2: System Preferences
1. System Preferences → Network
2. Select your WiFi connection
3. Click "Advanced"
4. Go to "TCP/IP" tab
5. Copy "IPv4 Address"

## Linux

### Terminal
```bash
hostname -I
```
or
```bash
ifconfig | grep "inet "
```

## What You're Looking For

Your IP address will look like one of these:
- `192.168.1.100` (most common)
- `192.168.0.50`
- `10.0.0.25`
- `172.16.x.x`

**NOT** `127.0.0.1` (that's localhost, only works on same machine)

## Update Your Mobile App

Once you have your IP address:

1. Open: `SnowboardingExplained/backend/mobile/src/config.ts`
2. Find this line:
   ```typescript
   export const API_URL = 'http://192.168.1.100:3001';
   ```
3. Replace `192.168.1.100` with YOUR IP address
4. Save the file
5. Restart mobile app: `npm start`

## Verify It Works

### From Your Computer
Open browser and go to:
```
http://YOUR_IP:3001/api/health
```

You should see:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-12-13T...",
    "uptime": 123.45
  }
}
```

### From Your Phone
1. Open browser on phone
2. Go to: `http://YOUR_IP:3001/api/health`
3. Should see the same JSON response

If you see this, your phone can reach the backend! ✅

## Troubleshooting

### "Connection refused"
- Backend is not running
- Run `npm run dev` in backend folder

### "Connection timed out"
- Wrong IP address
- Phone and computer not on same WiFi
- Firewall blocking port 3001

### "Can't find my IP"
- Make sure you're connected to WiFi (not Ethernet)
- Run the command again
- Look for the address that starts with `192.168` or `10.`

## Pro Tips

- **Static IP**: Consider setting a static IP on your computer so it doesn't change
- **Hostname**: Some networks support `http://COMPUTER_NAME:3001` instead of IP
- **Port Forwarding**: If on different networks, you'll need to set up port forwarding
- **VPN**: If using VPN, both devices need to be on the same VPN

## Still Having Issues?

1. Verify backend is running: `npm run dev`
2. Check firewall isn't blocking port 3001
3. Restart WiFi on both devices
4. Restart Expo: `npm start`
5. Check console logs for errors
