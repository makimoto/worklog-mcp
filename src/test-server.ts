#!/usr/bin/env node

import { SimpleWorkLogServer } from './mcp/simpleServer';

async function main() {
  const server = new SimpleWorkLogServer();

  process.on('SIGINT', async () => {
    console.error('Received SIGINT, shutting down...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
