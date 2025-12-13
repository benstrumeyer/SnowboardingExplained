/**
 * App Configuration
 */

// Development - Using ngrok tunnel
export const API_URL = 'https://uncongenial-nonobstetrically-norene.ngrok-free.dev';  // Replace with your ngrok URL from step 2

// Production (uncomment when deploying)
// export const API_URL = 'https://snowboarding-explained.vercel.app';

export const config = {
  apiUrl: API_URL,
  timeout: 30000,
  retryAttempts: 3,
};

export const DEBUG = true;
