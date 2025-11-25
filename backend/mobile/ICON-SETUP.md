# App Icon Setup

## Quick Setup with Expo

1. **Create your icon image:**
   - Size: 1024x1024 pixels (PNG with transparency)
   - Design: Snowboarder doing a method grab
   - Background: Solid color or gradient (blue sky recommended)

2. **Use a free icon generator:**
   - Go to https://www.appicon.co/ or https://icon.kitchen/
   - Upload your 1024x1024 image
   - Download the generated icon set

3. **Replace the default icon:**
   - Save your icon as `icon.png` in `backend/mobile/assets/`
   - Update `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1f2937"
    }
  }
}
```

## Quick Icon Ideas

### Option 1: Use an emoji-based icon (fastest)
Create a simple 1024x1024 PNG with:
- Background: Blue gradient (#3b82f6 to #1e40af)
- Emoji: 🏂 (large, centered)
- Text: "SE" below it

### Option 2: Find free snowboard icons
- https://www.flaticon.com/search?word=snowboard
- https://thenounproject.com/search/?q=snowboard
- Look for "method grab" or "snowboard trick" illustrations

### Option 3: AI-generated icon
Use DALL-E, Midjourney, or similar:
Prompt: "App icon, minimalist snowboarder doing a method grab, blue gradient background, flat design, 1024x1024"

## After adding the icon:

```bash
cd backend/mobile
npx expo prebuild --clean
```

Then rebuild your app in Expo Go or create a development build.

## For now (temporary emoji icon):

You can use the snowboarder emoji 🏂 as a placeholder by updating your app.json icon path to use Expo's default icon generator.
