# Install Missing Dependencies

The backend is missing two dependencies needed for form analysis:

## Quick Fix

Run this command in the backend folder:

```bash
npm install mongodb uuid @types/uuid
```

Or if you prefer, just run:

```bash
npm install
```

This will install all dependencies from the updated package.json.

## What Was Added

- `mongodb` - Database driver for MongoDB
- `uuid` - For generating unique video IDs
- `@types/uuid` - TypeScript types for uuid

## After Installing

1. The TypeScript errors will go away
2. Restart the backend with `npm run dev`
3. Try uploading a video again

The form analysis endpoint should now work!
