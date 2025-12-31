# ============================================
# BASE IMAGE - Node.js with Alpine Linux
# ============================================
# FROM: Specifies the base image
# node:18-alpine = Node.js 18 on Alpine Linux
# Alpine is a minimal Linux distribution (~5MB) - much smaller than Ubuntu
# This keeps the image size small while having Node.js pre-installed
FROM node:18-alpine

# WORKDIR: Sets the working directory inside the container
# All subsequent commands run from /app
# Think of it like: mkdir -p /app && cd /app
WORKDIR /app

# ============================================
# Install build tools, Python, and ffmpeg
# ============================================
# apk add: Alpine's package manager (like apt-get for Ubuntu)
# --no-cache: Don't cache packages (saves space)
# build-base: Alpine's equivalent of build-essential (gcc, g++, make)
# python3: Python interpreter (needed by node-gyp for building native modules)
# make: Build automation tool
# ffmpeg: Video processing tool (needed for frame extraction)
RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    ffmpeg

# ============================================
# Verify Node.js and npm are available
# ============================================
# node --version: Print Node.js version
# npm --version: Print npm version
# These commands verify the installation worked
RUN node --version && npm --version

# ============================================
# EXPOSE: Document which port the app uses
# ============================================
# 3000: Default Node.js development server port
# Note: This doesn't actually open the port, just documents it
EXPOSE 3000

# ============================================
# CMD: Default command when container starts
# ============================================
# CMD ["node"]: Run the Node.js interpreter
# This can be overridden when running the container
CMD ["node"]
