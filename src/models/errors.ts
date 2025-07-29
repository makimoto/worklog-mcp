// Re-export ValidationError from validation module
export { ValidationError } from './validation';
import { ValidationError as ValidationErrorClass } from './validation';

/**
 * Storage operation error class for database and storage failures
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public operation: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'StorageError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Session-related error class for session management failures
 */
export class SessionError extends Error {
  constructor(
    message: string,
    public sessionId: string
  ) {
    super(message);
    this.name = 'SessionError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      sessionId: this.sessionId,
    };
  }
}

/**
 * MCP tool error class for Model Context Protocol tool failures
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public toolName: string,
    public code: string
  ) {
    super(message);
    this.name = 'MCPError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      toolName: this.toolName,
      code: this.code,
    };
  }
}

/**
 * Standard error response format for consistent error handling
 */
export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    details: Record<string, unknown>;
  };
  success: false;
  timestamp: string;
}

/**
 * Format any error into a consistent response structure
 */
export function formatErrorResponse(error: Error): ErrorResponse {
  const timestamp = new Date().toISOString();

  // Handle specific error types with their custom properties
  if (error instanceof ValidationErrorClass) {
    return {
      error: {
        type: 'ValidationError',
        message: error.message,
        details: {
          field: error.field,
          providedValue: error.providedValue,
        },
      },
      success: false,
      timestamp,
    };
  }

  if (error instanceof StorageError) {
    return {
      error: {
        type: 'StorageError',
        message: error.message,
        details: {
          operation: error.operation,
          isRetryable: error.isRetryable,
        },
      },
      success: false,
      timestamp,
    };
  }

  if (error instanceof SessionError) {
    return {
      error: {
        type: 'SessionError',
        message: error.message,
        details: {
          sessionId: error.sessionId,
        },
      },
      success: false,
      timestamp,
    };
  }

  if (error instanceof MCPError) {
    return {
      error: {
        type: 'MCPError',
        message: error.message,
        details: {
          toolName: error.toolName,
          code: error.code,
        },
      },
      success: false,
      timestamp,
    };
  }

  // Handle generic errors by extracting additional properties
  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'name' && key !== 'message' && key !== 'stack') {
      details[key] = value;
    }
  }

  return {
    error: {
      type: error.constructor.name,
      message: error.message,
      details,
    },
    success: false,
    timestamp,
  };
}
