/**
 * WSL Configuration
 * 
 * Defines paths and settings for WSL integration
 */

export const wslConfig = {
  // WSL distro name
  distro: 'Ubuntu',

  // Pose service paths
  poseService: {
    root: '/home/ben/pose-service',
    app: '/home/ben/pose-service/app.py',
    venv: '/home/ben/pose-service/venv',
    python: '/home/ben/pose-service/venv/bin/python',
    port: 5000,
    host: 'localhost',
  },

  // Python environment
  python: {
    version: '3.9+',
    venvPath: '/home/ben/pose-service/venv',
    pythonPath: '/home/ben/pose-service/venv/bin/python',
    pipPath: '/home/ben/pose-service/venv/bin/pip',
  },

  // ViTDet setup
  vitdet: {
    detectron2Repo: 'https://github.com/facebookresearch/detectron2.git',
    modelPath: '/home/ben/.cache/detectron2',
    modelUrl: 'https://dl.fbaipublicfiles.com/detectron2/ViTDet_models/vitdet_b_coco_252169.pkl',
  },

  // Logs
  logs: {
    poseServiceLog: '/home/ben/pose-service/logs/app.log',
    maxLines: 100,
  },

  // Timeouts
  timeouts: {
    command: 30000, // 30 seconds
    fileRead: 10000, // 10 seconds
    fileWrite: 10000, // 10 seconds
    serviceStart: 60000, // 60 seconds
  },

  // File size limits
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxBufferSize: 10 * 1024 * 1024, // 10MB
  },
};

export default wslConfig;
