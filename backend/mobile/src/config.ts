/**
 * App Configuration
 */

// Backend running through ngrok tunnel
// Get the ngrok URL from environment or use fallback
const ngrokUrl = process.env.NGROK_URL || 'https://uncongenial-nonobstetrically-norene.ngrok-free.dev';
export const API_URL = ngrokUrl;

// Production (uncomment when deploying)
// export const API_URL = 'https://snowboarding-explained.vercel.app';

export const config = {
  apiUrl: API_URL,
  timeout: 30000,
  retryAttempts: 3,
};

export const DEBUG = true;

// Testing mode - disable Gemini calls to avoid rate limits
export const TESTING_MODE = true;
export const MOCK_RESPONSES = true;
