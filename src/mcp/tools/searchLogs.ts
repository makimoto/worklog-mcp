import type { StorageManager } from '../../storage/manager';
import { validateMCPParameters } from '../../models/inputValidation';
import { formatErrorResponse, MCPError } from '../../models/errors';

/**
 * MCP tool for searching logs by content
 */
export async function searchLogsTool(
  storageManager: StorageManager,
  args: Record<string, unknown>
) {
  try {
    // Validate input parameters
    validateMCPParameters('search_logs', args);

    // Validate required query parameter
    if (typeof args['query'] !== 'string') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: 'query is required and must be a string',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const query = args['query'];

    // Parse optional fields parameter
    let fields: string[] | undefined;
    if (args['fields'] !== undefined) {
      if (Array.isArray(args['fields'])) {
        // Validate array elements are strings
        if (args['fields'].every((field) => typeof field === 'string')) {
          fields = args['fields'] as string[];
        }
      } else if (typeof args['fields'] === 'string') {
        fields = [args['fields']];
      }
    }

    // Parse optional limit parameter
    let limit = 50; // default
    if (args['limit'] !== undefined) {
      if (typeof args['limit'] === 'number') {
        limit = args['limit'];
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
        limit = parsed;
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

    // Search logs
    const response = await storageManager.searchLogs(query, fields, limit);

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
        : new MCPError('Unknown error occurred', 'search_logs', 'UNKNOWN_ERROR')
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
