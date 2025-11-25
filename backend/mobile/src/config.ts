/**
 * App Configuration
 */

// API URL - Use your computer's IP address for mobile testing
// Find your IP: Run "ipconfig" in terminal and look for IPv4 Address
export const API_URL = __DEV__ 
  ? 'http://192.168.1.152:3000'  // Your computer's IP (change if different)
  : 'https://snowboarding-explained.vercel.app';  // Production

export const config = {
  apiUrl: API_URL,
};
