import dotenv from 'dotenv';
import { connectDB, disconnectDB, getDB } from './db/connection';
import { initializeCollections } from './db/schemas';
import { ToolRegistry } from './tools/registry';
import { Cache } from './cache/cache';

dotenv.config();

let toolRegistry: ToolRegistry;
let cache: Cache;

export async function initializeMCPServer(): Promise<void> {
  try {
    // Connect to database
    const db = await connectDB();

    // Initialize collections and indexes
    await initializeCollections(db);

    // Initialize tool registry
    toolRegistry = new ToolRegistry();

    // Initialize cache
    cache = new Cache(300); // 5 minute default TTL

    console.log('✓ MCP Server initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize MCP Server:', error);
    throw error;
  }
}

export function getToolRegistry(): ToolRegistry {
  if (!toolRegistry) {
    throw new Error('Tool registry not initialized');
  }
  return toolRegistry;
}

export function getCache(): Cache {
  if (!cache) {
    throw new Error('Cache not initialized');
  }
  return cache;
}

export async function shutdownMCPServer(): Promise<void> {
  await disconnectDB();
  console.log('✓ MCP Server shut down');
}

// Start server if run directly
if (require.main === module) {
  initializeMCPServer()
    .then(() => {
      console.log('MCP Server running. Press Ctrl+C to exit.');
    })
    .catch((error) => {
      console.error('Failed to start MCP Server:', error);
      process.exit(1);
    });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await shutdownMCPServer();
    process.exit(0);
  });
}
