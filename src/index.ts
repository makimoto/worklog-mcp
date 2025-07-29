#!/usr/bin/env node

// Library exports for programmatic use
export * from './models';
export * from './storage';
export * from './mcp';
export * from './display';
export * from './config';

// MCP Server startup when run directly
import { StorageManager } from './storage/manager.js';
import { WorkLogMCPServer } from './mcp/server.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

async function startMCPServer() {
  // Check if running as main module (not imported)
  // For CommonJS compatibility
  const isMainModule = require.main === module;
  if (isMainModule) {
    try {
      // Initialize storage
      const defaultDbPath = path.join(os.homedir(), '.worklog', 'work_logs.db');
      const dbPath = process.env['WORKLOG_DB_PATH'] || defaultDbPath;

      // Ensure parent directory exists
      const parentDir = path.dirname(dbPath);
      await fs.promises.mkdir(parentDir, { recursive: true });

      const storageManager = new StorageManager(dbPath);
      await storageManager.initialize();

      // Start MCP server
      const server = new WorkLogMCPServer(storageManager, {
        databasePath: dbPath,
        maxLogSize: 10000,
      });

      await server.start();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.error('Shutting down MCP server...');
        await storageManager.close();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.error('Shutting down MCP server...');
        await storageManager.close();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

// Start server if running directly
startMCPServer().catch(console.error);
