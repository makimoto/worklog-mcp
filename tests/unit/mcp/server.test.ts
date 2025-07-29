import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkLogMCPServer } from '../../../src/mcp/server';
import { StorageManager } from '../../../src/storage/manager';
import type { ServerConfig } from '../../../src/models/types';

describe('WorkLogMCPServer', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;
  let config: ServerConfig;

  beforeEach(() => {
    // Mock StorageManager with minimal methods
    mockStorageManager = {
      initialize: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;

    config = {
      databasePath: ':memory:',
      maxLogSize: 10000,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create server instance', () => {
      const server = new WorkLogMCPServer(mockStorageManager, config);
      expect(server).toBeInstanceOf(WorkLogMCPServer);
    });
  });

  describe('lifecycle methods', () => {
    it('should initialize storage on start', async () => {
      const server = new WorkLogMCPServer(mockStorageManager, config);

      await server.start();

      expect(mockStorageManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should close storage on stop', async () => {
      const server = new WorkLogMCPServer(mockStorageManager, config);

      await server.stop();

      expect(mockStorageManager.close).toHaveBeenCalledTimes(1);
    });
  });
});
