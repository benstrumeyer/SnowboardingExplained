import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

/**
 * Frame Quality Configuration
 * 
 * Defines quality thresholds for frame filtering and interpolation.
 * All values can be overridden via environment variables.
 */

interface FrameQualityConfig {
  // Confidence filtering
  MIN_CONFIDENCE: number;

  // Off-screen detection
  BOUNDARY_THRESHOLD: number; // 5% of image edge
  OFF_SCREEN_CONFIDENCE: number;

  // Outlier detection (trend-based)
  OUTLIER_DEVIATION_THRESHOLD: number; // 30% deviation from trend
  TREND_WINDOW_SIZE: number; // Use 5-7 frames to establish trend

  // Interpolation
  MAX_INTERPOLATION_GAP: number; // Don't interpolate gaps > 10 frames

  // Logging
  DEBUG_MODE: boolean;
}

const config: FrameQualityConfig = {
  // Confidence filtering
  MIN_CONFIDENCE: parseFloat(process.env.FRAME_QUALITY_MIN_CONFIDENCE ?? '0.6'),

  // Off-screen detection
  BOUNDARY_THRESHOLD: parseFloat(process.env.FRAME_QUALITY_BOUNDARY_THRESHOLD ?? '0.05'),
  OFF_SCREEN_CONFIDENCE: parseFloat(process.env.FRAME_QUALITY_OFF_SCREEN_CONFIDENCE ?? '0.3'),

  // Outlier detection
  OUTLIER_DEVIATION_THRESHOLD: parseFloat(process.env.FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD ?? '0.3'),
  TREND_WINDOW_SIZE: parseInt(process.env.FRAME_QUALITY_TREND_WINDOW_SIZE ?? '5', 10),

  // Interpolation
  MAX_INTERPOLATION_GAP: parseInt(process.env.FRAME_QUALITY_MAX_INTERPOLATION_GAP ?? '10', 10),

  // Logging
  DEBUG_MODE: process.env.FRAME_QUALITY_DEBUG_MODE === 'true'
};

/**
 * Validate configuration values
 */
function validateConfig(cfg: FrameQualityConfig): void {
  const errors: string[] = [];

  if (cfg.MIN_CONFIDENCE < 0 || cfg.MIN_CONFIDENCE > 1) {
    errors.push(`MIN_CONFIDENCE must be between 0 and 1, got ${cfg.MIN_CONFIDENCE}`);
  }

  if (cfg.BOUNDARY_THRESHOLD < 0 || cfg.BOUNDARY_THRESHOLD > 0.5) {
    errors.push(`BOUNDARY_THRESHOLD must be between 0 and 0.5, got ${cfg.BOUNDARY_THRESHOLD}`);
  }

  if (cfg.OFF_SCREEN_CONFIDENCE < 0 || cfg.OFF_SCREEN_CONFIDENCE > 1) {
    errors.push(`OFF_SCREEN_CONFIDENCE must be between 0 and 1, got ${cfg.OFF_SCREEN_CONFIDENCE}`);
  }

  if (cfg.OUTLIER_DEVIATION_THRESHOLD < 0 || cfg.OUTLIER_DEVIATION_THRESHOLD > 1) {
    errors.push(`OUTLIER_DEVIATION_THRESHOLD must be between 0 and 1, got ${cfg.OUTLIER_DEVIATION_THRESHOLD}`);
  }

  if (cfg.TREND_WINDOW_SIZE < 3 || cfg.TREND_WINDOW_SIZE > 20) {
    errors.push(`TREND_WINDOW_SIZE must be between 3 and 20, got ${cfg.TREND_WINDOW_SIZE}`);
  }

  if (cfg.MAX_INTERPOLATION_GAP < 1 || cfg.MAX_INTERPOLATION_GAP > 100) {
    errors.push(`MAX_INTERPOLATION_GAP must be between 1 and 100, got ${cfg.MAX_INTERPOLATION_GAP}`);
  }

  if (errors.length > 0) {
    throw new Error(`Frame Quality Configuration Errors:\n${errors.join('\n')}`);
  }
}

// Validate on load
validateConfig(config);

export default config;
