import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { StorageManager } from '../storage/manager';
import type { ServerConfig } from '../models/types';
import { createLogTool } from './tools/createLog';
import { getLogsTool, getSessionLogsTool } from './tools/getLogs';
import { searchLogsTool } from './tools/searchLogs';

/**
 * MCP Server for AI Agent Work Log
 */
export class WorkLogMCPServer {
  private server: Server;

  constructor(
    private storageManager: StorageManager,
    _config: ServerConfig
  ) {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'worklog-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_log',
            description: 'Create a new work log entry',
            inputSchema: {
              type: 'object',
              properties: {
                project_name: {
                  type: 'string',
                  description: 'Name of the project being worked on',
                },
                work_content: {
                  type: 'string',
                  description: 'Description of work performed',
                },
                session_id: {
                  type: 'string',
                  description: 'Session ID (optional, auto-generated if not provided)',
                },
                successes: {
                  type: 'string',
                  description: 'Successful outcomes of the work',
                },
                failures: {
                  type: 'string',
                  description: 'Failed attempts or issues encountered',
                },
                blockers: {
                  type: 'string',
                  description: 'Blockers or obstacles faced',
                },
                thoughts: {
                  type: 'string',
                  description: 'Thoughts, insights, or reflections',
                },
                new_session: {
                  type: 'boolean',
                  description: 'Create a new session (cannot be used with session_id)',
                },
              },
              required: ['project_name', 'work_content'],
            },
          },
          {
            name: 'get_logs',
            description: 'Get logs with optional filtering and pagination',
            inputSchema: {
              type: 'object',
              properties: {
                project_name: {
                  type: 'string',
                  description: 'Filter by project name',
                },
                session_id: {
                  type: 'string',
                  description: 'Filter by session ID',
                },
                start_date: {
                  type: 'string',
                  description: 'Filter logs from this date (ISO 8601 format)',
                },
                end_date: {
                  type: 'string',
                  description: 'Filter logs until this date (ISO 8601 format)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of logs to return (default: 50)',
                },
                offset: {
                  type: 'number',
                  description: 'Number of logs to skip (default: 0)',
                },
              },
              required: [],
            },
          },
          {
            name: 'get_session_logs',
            description: 'Get all logs for a specific session',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: 'Session ID to get logs for',
                },
              },
              required: ['session_id'],
            },
          },
          {
            name: 'search_logs',
            description: 'Search logs by content with full-text search',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query string',
                },
                fields: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Fields to search in (optional, defaults to all text fields)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 50)',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'create_log':
          return await createLogTool(this.storageManager, args || {});
        case 'get_logs':
          return await getLogsTool(this.storageManager, args || {});
        case 'get_session_logs':
          return await getSessionLogsTool(this.storageManager, args || {});
        case 'search_logs':
          return await searchLogsTool(this.storageManager, args || {});
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start(): Promise<void> {
    await this.storageManager.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async stop(): Promise<void> {
    await this.storageManager.close();
  }
}
