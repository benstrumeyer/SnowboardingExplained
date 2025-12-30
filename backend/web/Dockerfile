# ============================================
# MULTI-STAGE BUILD: Dependencies Stage
# ============================================
# This Dockerfile uses multi-stage builds to optimize caching
# Stage 1 (deps): Install dependencies - cached and reused
# Stage 2 (build): Build the application - rebuilt when code changes
# Stage 3 (runtime): Final image with only what's needed

# FROM base-node:latest as deps
# FROM: Use the base image we created earlier (has Node.js and build tools)
# as deps: Name this stage "deps" so we can reference it later
FROM base-node:latest as deps

# WORKDIR: Set working directory to /app
# All subsequent commands run from /app
WORKDIR /app

# ============================================
# Copy package files
# ============================================
# COPY: Copy files from host machine into container
# package*.json: Source files (relative to build context ./backend/web)
#   package*.json matches both package.json and package-lock.json
# ./: Destination in container (current directory = /app)
# This copies the list of Node.js packages to install
COPY package*.json ./

# ============================================
# Install Node.js dependencies
# ============================================
# RUN npm ci: Install dependencies
# npm ci (clean install) is better than npm install for Docker
# It installs exact versions from package-lock.json (reproducible builds)
# This creates node_modules directory with all dependencies
RUN npm ci

# ============================================
# BUILD STAGE: Build the application
# ============================================
# FROM deps as build
# FROM: Use the previous stage (deps) as base
# as build: Name this stage "build"
FROM deps as build

# WORKDIR: Set working directory
WORKDIR /app

# ============================================
# Copy source code and config files
# ============================================
# COPY: Copy files from host into container
# src: Source directory with React/TypeScript code (relative to build context)
# ./src: Destination in container
COPY src ./src

# COPY: Copy public assets (images, fonts, etc.)
# public: Source directory with static files (relative to build context)
# ./public: Destination in container
COPY public ./public

# COPY: Copy HTML entry point
# index.html: Main HTML file (relative to build context)
# ./: Destination in container
COPY index.html ./

# COPY: Copy Vite configuration
# vite.config.ts: Vite build tool configuration (relative to build context)
# ./: Destination in container
COPY vite.config.ts ./

# COPY: Copy TypeScript configuration
# tsconfig.json: TypeScript compiler configuration (relative to build context)
# ./: Destination in container
COPY tsconfig.json ./

# COPY: Copy TypeScript Node configuration
# tsconfig.node.json: TypeScript config for Node.js tools (relative to build context)
# ./: Destination in container
COPY tsconfig.node.json ./

# ============================================
# Build for production
# ============================================
# RUN npm run build: Build the React application
# This compiles TypeScript to JavaScript and bundles everything
# Creates a dist/ directory with optimized production build
# Vite is a fast build tool for modern web applications
RUN npm run build

# ============================================
# RUNTIME STAGE: Final image
# ============================================
# FROM node:18-alpine as runtime
# FROM: Use a fresh Node.js Alpine image
# as runtime: Name this stage "runtime"
# We use Alpine (minimal Linux) to keep the final image small
# Alpine is only ~5MB vs Ubuntu which is much larger
FROM node:18-alpine as runtime

# WORKDIR: Set working directory
WORKDIR /app

# ============================================
# Copy package files
# ============================================
# COPY: Copy package files from host
# package*.json: Source files (relative to build context)
# ./: Destination in container
# We copy these again so npm knows what packages are installed
COPY package*.json ./

# ============================================
# Copy built assets from build stage
# ============================================
# COPY --from=build: Copy files from a previous stage (not from host)
# /app/dist: Source directory in build stage (built application)
# ./dist: Destination in runtime stage
# This copies the optimized production build
COPY --from=build /app/dist ./dist

# ============================================
# Copy node_modules from build stage
# ============================================
# COPY --from=build: Copy dependencies from build stage
# /app/node_modules: Source directory in build stage
# ./node_modules: Destination in runtime stage
# This copies all installed Node.js packages
# We copy from build stage instead of running npm ci again (faster)
COPY --from=build /app/node_modules ./node_modules

# ============================================
# EXPOSE: Document which port the app uses
# ============================================
# 5173: Vite development server port
# Note: This doesn't actually open the port, just documents it
# The port is opened when running the container with -p flag
EXPOSE 5173

# ============================================
# CMD: Default command when container starts
# ============================================
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
# This runs the development server when the container starts
# npm run dev: Runs the "dev" script from package.json
# --: Passes remaining arguments to the dev script
# --host 0.0.0.0: Listen on all network interfaces (not just localhost)
#   This is important in Docker so the app is accessible from outside the container
# The frontend dev server listens on port 5173 for requests
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
