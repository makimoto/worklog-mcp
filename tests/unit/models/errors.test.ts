import { describe, it, expect } from '@jest/globals';
import {
  ValidationError,
  StorageError,
  SessionError,
  MCPError,
  formatErrorResponse,
} from '../../../src/models/errors';

describe('Error Types', () => {
  describe('ValidationError', () => {
    it('should create validation error with message only', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBeUndefined();
      expect(error.providedValue).toBeUndefined();
    });

    it('should create validation error with field and value', () => {
      const error = new ValidationError('Project name is required', 'projectName', '');

      expect(error.message).toBe('Project name is required');
      expect(error.field).toBe('projectName');
      expect(error.providedValue).toBe('');
    });

    it('should include field and value in serialization', () => {
      const error = new ValidationError('Invalid format', 'format', 'invalid');
      const serialized = error.toJSON();

      expect(serialized).toEqual({
        name: 'ValidationError',
        message: 'Invalid format',
        field: 'format',
        providedValue: 'invalid',
      });
    });
  });

  describe('StorageError', () => {
    it('should create storage error with message and operation', () => {
      const error = new StorageError('Database connection failed', 'connect');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.name).toBe('StorageError');
      expect(error.message).toBe('Database connection failed');
      expect(error.operation).toBe('connect');
      expect(error.isRetryable).toBe(false);
    });

    it('should create retryable storage error', () => {
      const error = new StorageError('Temporary lock', 'write', true);

      expect(error.isRetryable).toBe(true);
    });

    it('should include operation and retryable flag in serialization', () => {
      const error = new StorageError('Write failed', 'insert', true);
      const serialized = error.toJSON();

      expect(serialized).toEqual({
        name: 'StorageError',
        message: 'Write failed',
        operation: 'insert',
        isRetryable: true,
      });
    });
  });

  describe('SessionError', () => {
    it('should create session error with session ID', () => {
      const error = new SessionError('Session not found', 'session-123');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SessionError);
      expect(error.name).toBe('SessionError');
      expect(error.message).toBe('Session not found');
      expect(error.sessionId).toBe('session-123');
    });

    it('should include session ID in serialization', () => {
      const error = new SessionError('Invalid session', 'invalid-session');
      const serialized = error.toJSON();

      expect(serialized).toEqual({
        name: 'SessionError',
        message: 'Invalid session',
        sessionId: 'invalid-session',
      });
    });
  });

  describe('MCPError', () => {
    it('should create MCP error with tool name and code', () => {
      const error = new MCPError('Tool execution failed', 'create_log', 'EXECUTION_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MCPError);
      expect(error.name).toBe('MCPError');
      expect(error.message).toBe('Tool execution failed');
      expect(error.toolName).toBe('create_log');
      expect(error.code).toBe('EXECUTION_ERROR');
    });

    it('should include tool name and code in serialization', () => {
      const error = new MCPError('Invalid parameters', 'get_logs', 'INVALID_PARAMS');
      const serialized = error.toJSON();

      expect(serialized).toEqual({
        name: 'MCPError',
        message: 'Invalid parameters',
        toolName: 'get_logs',
        code: 'INVALID_PARAMS',
      });
    });
  });

  describe('formatErrorResponse', () => {
    it('should format ValidationError response', () => {
      const error = new ValidationError('Required field missing', 'projectName', undefined);
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        error: {
          type: 'ValidationError',
          message: 'Required field missing',
          details: {
            field: 'projectName',
            providedValue: undefined,
          },
        },
        success: false,
        timestamp: expect.any(String),
      });
    });

    it('should format StorageError response', () => {
      const error = new StorageError('Connection timeout', 'query', true);
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        error: {
          type: 'StorageError',
          message: 'Connection timeout',
          details: {
            operation: 'query',
            isRetryable: true,
          },
        },
        success: false,
        timestamp: expect.any(String),
      });
    });

    it('should format SessionError response', () => {
      const error = new SessionError('Session expired', 'session-456');
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        error: {
          type: 'SessionError',
          message: 'Session expired',
          details: {
            sessionId: 'session-456',
          },
        },
        success: false,
        timestamp: expect.any(String),
      });
    });

    it('should format MCPError response', () => {
      const error = new MCPError('Tool not found', 'unknown_tool', 'TOOL_NOT_FOUND');
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        error: {
          type: 'MCPError',
          message: 'Tool not found',
          details: {
            toolName: 'unknown_tool',
            code: 'TOOL_NOT_FOUND',
          },
        },
        success: false,
        timestamp: expect.any(String),
      });
    });

    it('should format generic Error response', () => {
      const error = new Error('Unexpected error');
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        error: {
          type: 'Error',
          message: 'Unexpected error',
          details: {},
        },
        success: false,
        timestamp: expect.any(String),
      });
    });

    it('should handle errors with additional properties', () => {
      const error = new Error('Test error') as Error & { code: string };
      error.code = 'TEST_CODE';

      const response = formatErrorResponse(error);

      expect(response.error.details).toEqual({
        code: 'TEST_CODE',
      });
    });
  });
});
