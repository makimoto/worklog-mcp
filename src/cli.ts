#!/usr/bin/env node

/**
 * CLI entry point for MCP server
 */

import { WorkLogMCPServer } from './mcp/server.js';
import { StorageManager } from './storage/manager.js';
import type { ServerConfig } from './models/types.js';
import path from 'path';

async function main() {
  // Check if running in stdio mode for MCP
  const isStdioMode = process.argv.includes('--stdio');

  if (!isStdioMode) {
    console.error('This CLI currently only supports MCP stdio mode.');
    console.error('Usage: node cli.js --stdio');
    process.exit(1);
  }

  try {
    // Configure database path (use local worklog.db by default)
    const databasePath = process.env['WORKLOG_DB_PATH'] || path.join(process.cwd(), 'worklog.db');

    const config: ServerConfig = {
      databasePath,
      maxLogSize: 10000,
    };

    // Create storage manager and MCP server
    const storageManager = new StorageManager(databasePath);
    const server = new WorkLogMCPServer(storageManager, config);

    // Start the server
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
