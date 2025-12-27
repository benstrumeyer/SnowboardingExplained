/**
 * Pose Pool Configuration
 * 
 * Reads configuration from environment variables and provides defaults.
 */

import path from 'path';
import fs from 'fs';
import logger from '../logger';

export interface PosePoolConfig {
  pythonServicePath: string;
  useHttpService: boolean;
  maxConcurrentProcesses: number;
  queueMaxSize: number;
  processTimeoutMs: number;
  debug: boolean;
}

/**
 * Load and validate pose pool configuration from environment variables.
 */
export function loadPosePoolConfig(): PosePoolConfig {
  // Check if using HTTP service instead of process spawning
  const useHttpService = process.env.USE_HTTP_POSE_SERVICE === 'true';

  const config: PosePoolConfig = {
    pythonServicePath: process.env.POSE_SERVICE_PATH || path.join(__dirname, '../../..', 'pose-service'),
    useHttpService,
    maxConcurrentProcesses: parseInt(process.env.MAX_CONCURRENT_PROCESSES || '8', 10),
    queueMaxSize: parseInt(process.env.QUEUE_MAX_SIZE || '100', 10),
    processTimeoutMs: parseInt(process.env.PROCESS_TIMEOUT_MS || '120000', 10),
    debug: process.env.POSE_SERVICE_DEBUG === 'true'
  };

  // Validate configuration
  validatePosePoolConfig(config);

  return config;
}

/**
 * Validate pose pool configuration.
 */
function validatePosePoolConfig(config: PosePoolConfig): void {
  logger.info('Validating pose pool configuration...');

  // If using HTTP service, skip local file checks
  if (config.useHttpService) {
    logger.info('Using HTTP service mode - skipping local file validation');
    logger.info('Pose pool configuration loaded', {
      mode: 'HTTP',
      maxConcurrentProcesses: config.maxConcurrentProcesses,
      queueMaxSize: config.queueMaxSize,
      processTimeoutMs: config.processTimeoutMs,
      debug: config.debug
    });
    return;
  }

  // Local process mode validation
  logger.info('Using local process mode');

  // Check Python service path
  if (!fs.existsSync(config.pythonServicePath)) {
    logger.warn('Python service path does not exist', {
      path: config.pythonServicePath
    });
  } else {
    logger.info('✓ Python service path exists', {
      path: config.pythonServicePath
    });
  }

  // Check app.py exists
  const appPath = path.join(config.pythonServicePath, 'app.py');
  if (!fs.existsSync(appPath)) {
    logger.warn('app.py not found in Python service path', {
      path: appPath
    });
  } else {
    logger.info('✓ app.py found', { path: appPath });
  }

  // Check models directory
  const modelsPath = path.join(config.pythonServicePath, '.models');
  if (!fs.existsSync(modelsPath)) {
    logger.warn('Models directory does not exist', {
      path: modelsPath,
      hint: 'Run setup.sh to download models'
    });
  } else {
    logger.info('✓ Models directory exists', { path: modelsPath });

    // Check for model files
    const hmr2Path = path.join(modelsPath, 'hmr2', 'hmr2_ckpt.pt');
    const vitposePath = path.join(modelsPath, 'vitpose', 'vitpose_coco.pth');

    if (fs.existsSync(hmr2Path)) {
      logger.info('✓ HMR2 model found', { path: hmr2Path });
    } else {
      logger.warn('HMR2 model not found', { path: hmr2Path });
    }

    if (fs.existsSync(vitposePath)) {
      logger.info('✓ ViTPose model found', { path: vitposePath });
    } else {
      logger.warn('ViTPose model not found', { path: vitposePath });
    }
  }

  // Validate numeric values
  if (config.maxConcurrentProcesses < 1) {
    logger.warn('maxConcurrentProcesses is less than 1, using default', {
      value: config.maxConcurrentProcesses
    });
    config.maxConcurrentProcesses = 2;
  }

  if (config.queueMaxSize < 1) {
    logger.warn('queueMaxSize is less than 1, using default', {
      value: config.queueMaxSize
    });
    config.queueMaxSize = 100;
  }

  if (config.processTimeoutMs < 1000) {
    logger.warn('processTimeoutMs is less than 1000ms, using default', {
      value: config.processTimeoutMs
    });
    config.processTimeoutMs = 120000;
  }

  // Log final configuration
  logger.info('Pose pool configuration loaded', {
    mode: 'Process',
    pythonServicePath: config.pythonServicePath,
    maxConcurrentProcesses: config.maxConcurrentProcesses,
    queueMaxSize: config.queueMaxSize,
    processTimeoutMs: config.processTimeoutMs,
    debug: config.debug
  });
}
