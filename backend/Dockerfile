# ============================================
# MULTI-STAGE BUILD: Dependencies Stage
# ============================================
# This Dockerfile uses multi-stage builds to optimize caching
# Stage 1 (deps): Install dependencies - cached and reused
# Stage 2 (build): Add application code - rebuilt when code changes
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
# package*.json: Source files (relative to build context ./backend)
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
# BUILD STAGE: Add application code
# ============================================
# FROM deps as build
# FROM: Use the previous stage (deps) as base
# as build: Name this stage "build"
FROM deps as build

# WORKDIR: Set working directory
WORKDIR /app

# ============================================
# Copy source code and config
# ============================================
# COPY: Copy files from host into container
# src: Source directory with TypeScript code (relative to build context)
# ./src: Destination in container
COPY src ./src

# COPY: Copy API endpoint files
# api: Source directory with API handlers (relative to build context)
# ./api: Destination in container
COPY api ./api

# COPY: Copy TypeScript configuration
# tsconfig.json: TypeScript compiler configuration (relative to build context)
# ./: Destination in container
COPY tsconfig.json ./

# ============================================
# Build if needed (optional)
# ============================================
# RUN npm run build: Compile TypeScript to JavaScript
# This is commented out because we run in dev mode
# Uncomment if you want to build for production
# RUN npm run build

# ============================================
# RUNTIME STAGE: Final image
# ============================================
# FROM base-node:latest as runtime
# FROM: Use the base image again (fresh copy)
# as runtime: Name this stage "runtime"
# We use the base image again (not the build stage) to keep image small
# The build stage is only used to prepare code, not included in final image
FROM base-node:latest as runtime

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
# Copy built artifacts and source code from build stage
# ============================================
# COPY --from=build: Copy files from a previous stage (not from host)
# /app/src: Source directory in build stage
# ./src: Destination in runtime stage
# This copies the TypeScript source code
COPY --from=build /app/src ./src

# COPY --from=build: Copy API files from build stage
# /app/api: Source directory in build stage
# ./api: Destination in runtime stage
COPY --from=build /app/api ./api

# COPY --from=build: Copy TypeScript config from build stage
# /app/tsconfig.json: Source file in build stage
# ./: Destination in runtime stage
COPY --from=build /app/tsconfig.json ./

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
# 3001: Backend API server port
# Note: This doesn't actually open the port, just documents it
# The port is opened when running the container with -p flag
EXPOSE 3001

# ============================================
# HEALTHCHECK: Define how to check if container is healthy
# ============================================
# --interval=30s: Check every 30 seconds
# --timeout=10s: Wait max 10 seconds for response
# --start-period=30s: Wait 30 seconds before first check (let app start)
# --retries=3: Mark unhealthy after 3 failed checks
# CMD wget: Use wget to check if service is running
# --quiet: Don't print output
# --tries=1: Only try once
# --spider: Don't download, just check if URL exists
# http://localhost:3001/health: Check the health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# ============================================
# CMD: Default command when container starts
# ============================================
# CMD ["npm", "run", "dev"]
# This runs the development server when the container starts
# npm run dev: Runs the "dev" script from package.json
# The backend API listens on port 3001 for requests
CMD ["npm", "run", "dev"]
