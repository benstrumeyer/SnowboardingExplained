# WSL Integration

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Quick Setup

### WSL2 Prerequisites
```bash
# Update packages
sudo apt-get update && sudo apt-get upgrade

# Install essentials
sudo apt-get install -y build-essential python3-dev python3-venv git curl

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Kiro IDE Setup

1. Open Kiro → Open Folder
2. Select: `\\wsl.localhost\Ubuntu\home\<username>\repos\SnowboardingExplained`
3. Kiro auto-detects WSL environment

## Running Services

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Pose Service:**
```bash
cd backend/pose-service
source venv/bin/activate
python app.py
# Runs on http://localhost:5000
```

## File Access

- **From Windows:** `\\wsl.localhost\Ubuntu\home\<username>\repos\SnowboardingExplained`
- **From WSL:** `/mnt/c/Users/<username>/...`

## Python Virtual Environment

```bash
cd backend/pose-service
python3 -m venv venv
source venv/bin/activate
```

## Install Frozen Dependencies

```bash
cd ~/repos

# Install in order (critical)
cd detectron2 && pip install -e .
cd ../ViTDet && pip install -e .
cd ../4D-Humans && pip install -e .
cd ../PHALP && pip install -e .
```

## GPU Support (Optional)

```bash
# Install CUDA toolkit
sudo apt-get install -y nvidia-cuda-toolkit

# Verify GPU
python3 -c "import torch; print(torch.cuda.is_available())"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `lsof -i :3001` then `kill -9 <PID>` |
| Module not found | Activate venv: `source venv/bin/activate` |
| Slow performance | Keep files in WSL, not Windows drive |
| Terminal won't open | Restart Kiro IDE |

## Best Practices

- Keep project in WSL (don't edit from Windows explorer)
- Always activate venv before running Python
- Use `max_frames` parameter for testing
- Monitor memory during video processing

## Resources

- [WSL Docs](https://docs.microsoft.com/en-us/windows/wsl/)
- [Kiro WSL Integration](https://serverlessdna.com/strands/coding-with-ai/configure-kiro-with-wsl)
