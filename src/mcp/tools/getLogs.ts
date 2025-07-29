import type { StorageManager } from '../../storage/manager';
import type { LogFilters } from '../../models/types';
import { validateMCPParameters } from '../../models/inputValidation';
import { formatErrorResponse, MCPError } from '../../models/errors';

/**
 * MCP tool for getting logs with optional filtering
 */
export async function getLogsTool(storageManager: StorageManager, args: Record<string, unknown>) {
  try {
    // Validate input parameters
    validateMCPParameters('get_logs', args);

    // Parse and validate arguments
    const filters: LogFilters = {
      limit: 50, // default
      offset: 0, // default
    };

    // Handle limit parameter
    if (args['limit'] !== undefined) {
      if (typeof args['limit'] === 'number') {
        filters.limit = args['limit'];
      } else if (typeof args['limit'] === 'string') {
        const parsed = parseInt(args['limit'], 10);
        if (isNaN(parsed)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'limit must be a number',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        filters.limit = parsed;
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  error: 'limit must be a number',
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    // Handle offset parameter
    if (args['offset'] !== undefined) {
      if (typeof args['offset'] === 'number') {
        filters.offset = args['offset'];
      } else if (typeof args['offset'] === 'string') {
        const parsed = parseInt(args['offset'], 10);
        if (!isNaN(parsed)) {
          filters.offset = parsed;
        }
      }
    }

    // Handle optional filter parameters
    if (typeof args['project_name'] === 'string') {
      filters.projectName = args['project_name'];
    }

    if (typeof args['session_id'] === 'string') {
      filters.sessionId = args['session_id'];
    }

    if (typeof args['start_date'] === 'string') {
      filters.startDate = args['start_date'];
    }

    if (typeof args['end_date'] === 'string') {
      filters.endDate = args['end_date'];
    }

    // Get logs from storage
    const response = await storageManager.getLogs(filters);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorResponse = formatErrorResponse(
      error instanceof Error
        ? error
        : new MCPError('Unknown error occurred', 'get_logs', 'UNKNOWN_ERROR')
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
    };
  }
}

/**
 * MCP tool for getting all logs for a specific session
 */
export async function getSessionLogsTool(
  storageManager: StorageManager,
  args: Record<string, unknown>
) {
  try {
    // Validate input parameters
    validateMCPParameters('get_session_logs', args);

    // Validate required session_id parameter
    if (typeof args['session_id'] !== 'string') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: 'session_id is required and must be a string',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const sessionId = args['session_id'];

    // Get session logs from storage
    const response = await storageManager.getSessionLogs(sessionId);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorResponse = formatErrorResponse(
      error instanceof Error
        ? error
        : new MCPError('Unknown error occurred', 'get_logs', 'UNKNOWN_ERROR')
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
    };
  }
}
