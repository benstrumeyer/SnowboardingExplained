/**
 * App Configuration
 */

// API URL - change this when you deploy to Vercel
export const API_URL = __DEV__ 
  ? 'http://localhost:3000'  // Local development
  : 'https://your-api.vercel.app';  // Production

export const config = {
  apiUrl: API_URL,
};
