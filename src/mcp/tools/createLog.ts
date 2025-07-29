import type { StorageManager } from '../../storage/manager';
import type { CreateLogInput } from '../../models/types';
import { ValidationError, MCPError, formatErrorResponse } from '../../models/errors';
import { validateMCPParameters, sanitizeHtml } from '../../models/inputValidation';

/**
 * MCP tool for creating a new work log entry with session management
 */
export async function createLogTool(storageManager: StorageManager, args: Record<string, unknown>) {
  try {
    // Validate input parameters
    validateMCPParameters('create_log', args);

    const projectName = args['project_name'] as string;
    const workContent = args['work_content'] as string;
    const providedSessionId = args['session_id'] as string | undefined;
    const newSession = (args['new_session'] as boolean) || false;

    // Validation logic
    if (!providedSessionId && !newSession) {
      throw new ValidationError(
        'REQUIRED: Either provide session_id for continuing existing session, or set new_session=true to create a new session',
        'session_id'
      );
    }

    if (providedSessionId && newSession) {
      throw new ValidationError(
        'CONFLICT: Cannot specify both session_id and new_session=true. Use session_id for existing session or new_session=true for new session',
        'session_id'
      );
    }

    // Determine session ID
    let sessionId: string;
    let message: string;

    if (newSession) {
      sessionId = generateNewSessionId(projectName);
      message = 'New session created';
      console.log(`New session created: ${sessionId}`);
    } else {
      sessionId = providedSessionId!;
      message = 'Session continued';
      // Optional: Validate that the session exists
      await validateSessionExists(storageManager, sessionId, projectName);
      console.log(`Continuing session: ${sessionId}`);
    }

    // Convert MCP arguments to CreateLogInput with sanitization
    const input: CreateLogInput = {
      sessionId,
      projectName,
      workContent: sanitizeHtml(workContent),
      successes:
        typeof args['successes'] === 'string' ? sanitizeHtml(args['successes']) : undefined,
      failures: typeof args['failures'] === 'string' ? sanitizeHtml(args['failures']) : undefined,
      blockers: typeof args['blockers'] === 'string' ? sanitizeHtml(args['blockers']) : undefined,
      thoughts: typeof args['thoughts'] === 'string' ? sanitizeHtml(args['thoughts']) : undefined,
    };

    // Create the log entry
    const response = await storageManager.createLog(input);

    // Return MCP response format with session information
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: true,
              logId: response.logId,
              sessionId: response.sessionId,
              timestamp: response.timestamp,
              message,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Handle all errors with consistent error response format
    const errorResponse = formatErrorResponse(
      error instanceof Error
        ? error
        : new MCPError('Unknown error occurred', 'create_log', 'UNKNOWN_ERROR')
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

function generateNewSessionId(projectName: string): string {
  const date = new Date().toISOString().split('T')[0];
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness
  return `claude-code-${projectName}-${date}-${timestamp}`;
}

async function validateSessionExists(
  storageManager: StorageManager,
  sessionId: string,
  projectName: string
): Promise<void> {
  try {
    const sessionLogs = await storageManager.getSessionLogs(sessionId);
    if (sessionLogs.logs.length === 0) {
      console.warn(`WARNING: Session ${sessionId} has no existing logs`);
      return;
    }

    // Check if session belongs to this project
    const projectLogs = sessionLogs.logs.filter(
      (log) => (log as any).project_name === projectName || log.projectName === projectName
    );

    if (projectLogs.length === 0) {
      console.warn(`WARNING: Session ${sessionId} has no logs for project ${projectName}`);
    }
  } catch (error) {
    console.warn(`WARNING: Could not validate session ${sessionId}: ${error}`);
  }
}
