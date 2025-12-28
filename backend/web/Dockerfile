FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/web/package*.json ./

# Install dependencies
RUN npm ci

# Copy ALL source code and config files (including styles)
COPY backend/web/src ./src
COPY backend/web/public ./public
COPY backend/web/index.html ./
COPY backend/web/vite.config.ts ./
COPY backend/web/tsconfig.json ./
COPY backend/web/tsconfig.node.json ./

# Expose dev server port
EXPOSE 5173

# Start dev server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
