import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkLogMCPServer } from '../../../src/mcp/server';
import { StorageManager } from '../../../src/storage/manager';
import type { ServerConfig } from '../../../src/models/types';

// Mock the MCP SDK
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn(),
};

const mockTransport = {};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn(() => mockServer),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => mockTransport),
}));

describe('WorkLogMCPServer - MCP Integration', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;
  let config: ServerConfig;

  beforeEach(() => {
    mockStorageManager = {
      initialize: jest.fn(),
      close: jest.fn(),
      createLog: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;

    config = {
      databasePath: ':memory:',
      maxLogSize: 10000,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MCP server setup', () => {
    it('should create MCP Server instance with correct configuration', () => {
      const server = new WorkLogMCPServer(mockStorageManager, config);

      expect(server).toBeInstanceOf(WorkLogMCPServer);
      // Server should be created with proper capabilities
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      expect(Server).toHaveBeenCalledWith(
        {
          name: 'worklog-mcp',
          version: expect.any(String),
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
    });

    it('should register MCP protocol handlers', () => {
      new WorkLogMCPServer(mockStorageManager, config);

      // Should register handlers for list tools and call tool
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it('should connect transport on start', async () => {
      const server = new WorkLogMCPServer(mockStorageManager, config);

      await server.start();

      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });
  });

  describe('tool registration', () => {
    it('should provide create_log tool in list', async () => {
      new WorkLogMCPServer(mockStorageManager, config);

      // Get the list tools handler (first handler registered)
      const listToolsCall = mockServer.setRequestHandler.mock.calls[0];

      expect(listToolsCall).toBeDefined();

      const listToolsHandler = listToolsCall![1] as any;
      const result = await listToolsHandler();

      expect(result.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'create_log',
            description: expect.any(String),
            inputSchema: expect.objectContaining({
              type: 'object',
              required: ['project_name', 'work_content'],
            }),
          }),
        ])
      );
    });

    it('should handle create_log tool calls', async () => {
      mockStorageManager.createLog.mockResolvedValue({
        logId: 'test-id',
        sessionId: 'test-session',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      new WorkLogMCPServer(mockStorageManager, config);

      // Get the call tool handler (second handler registered)
      const callToolCall = mockServer.setRequestHandler.mock.calls[1];

      expect(callToolCall).toBeDefined();

      const callToolHandler = callToolCall![1] as any;
      const result = await callToolHandler({
        params: {
          name: 'create_log',
          arguments: {
            project_name: 'test-project',
            work_content: 'test work',
            new_session: true,
          },
        },
      });

      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('test-id'),
        },
      ]);
    });
  });
});
