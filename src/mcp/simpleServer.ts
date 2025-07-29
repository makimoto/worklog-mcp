import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { StorageManager } from '../storage/manager';
import { createLogTool } from './tools/createLog';

/**
 * Simple MCP Server for testing
 */
export class SimpleWorkLogServer {
  private server: Server;
  private storageManager: StorageManager;

  constructor(databasePath: string = ':memory:') {
    this.storageManager = new StorageManager(databasePath);

    this.server = new Server(
      {
        name: 'worklog-mcp-test',
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
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_log',
            description: 'Create a new work log entry',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: 'Session identifier (optional)',
                },
                project_name: {
                  type: 'string',
                  description: 'Name of the project being worked on',
                },
                work_content: {
                  type: 'string',
                  description: 'Description of work performed',
                },
                successes: {
                  type: 'string',
                  description: 'What went well (optional)',
                },
                failures: {
                  type: 'string',
                  description: 'What failed (optional)',
                },
                blockers: {
                  type: 'string',
                  description: 'Blockers encountered (optional)',
                },
                thoughts: {
                  type: 'string',
                  description: 'Additional thoughts (optional)',
                },
              },
              required: ['project_name', 'work_content'],
            },
          },
        ],
      };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_log':
            return await createLogTool(this.storageManager, args || {});
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, message);
      }
    });
  }

  async start(): Promise<void> {
    await this.storageManager.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple Work Log MCP Server started');
  }

  async stop(): Promise<void> {
    await this.storageManager.close();
  }
}
