import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createLogTool } from '../../../../src/mcp/tools/createLog';
import { StorageManager } from '../../../../src/storage/manager';
import { ValidationError } from '../../../../src/models/validation';

describe('createLogTool', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;

  beforeEach(() => {
    mockStorageManager = {
      createLog: jest.fn(),
      getSessionLogs: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;
  });

  beforeEach(() => {
    // Mock console.log to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore console.log
    jest.restoreAllMocks();
  });

  it('should create log with required fields', async () => {
    const mockResponse = {
      logId: 'test-log-id',
      sessionId: 'test-session-id',
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    mockStorageManager.createLog.mockResolvedValue(mockResponse);

    const args = {
      project_name: 'test-project',
      work_content: 'Did some work',
      new_session: true,
    };

    const result = await createLogTool(mockStorageManager, args);

    expect(mockStorageManager.createLog).toHaveBeenCalledWith({
      projectName: 'test-project',
      workContent: 'Did some work',
      sessionId: expect.stringMatching(/^claude-code-test-project-\d{4}-\d{2}-\d{2}-\d+$/),
    });

    const responseContent = JSON.parse(result.content[0]!.text);
    expect(responseContent.success).toBe(true);
    expect(responseContent.logId).toBe('test-log-id');
    expect(responseContent.sessionId).toBe('test-session-id');
    expect(responseContent.message).toBe('New session created');
  });

  it('should create log with all optional fields', async () => {
    const mockResponse = {
      logId: 'test-log-id',
      sessionId: 'test-session-id',
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    mockStorageManager.createLog.mockResolvedValue(mockResponse);
    (mockStorageManager.getSessionLogs as any).mockResolvedValue({
      logs: [{ sessionId: 'custom-session', projectName: 'test-project' }],
      sessionSummary: {},
    });

    const args = {
      session_id: 'custom-session',
      project_name: 'test-project',
      work_content: 'Did some work',
      successes: 'Everything worked',
      failures: 'Nothing failed',
      blockers: 'No blockers',
      thoughts: 'Some thoughts',
    };

    const result = await createLogTool(mockStorageManager, args);

    expect(mockStorageManager.createLog).toHaveBeenCalledWith({
      sessionId: 'custom-session',
      projectName: 'test-project',
      workContent: 'Did some work',
      successes: 'Everything worked',
      failures: 'Nothing failed',
      blockers: 'No blockers',
      thoughts: 'Some thoughts',
    });

    const responseContent = JSON.parse(result.content[0]!.text);
    expect(responseContent.success).toBe(true);
    expect(responseContent.logId).toBe('test-log-id');
    expect(responseContent.sessionId).toBe('test-session-id');
    expect(responseContent.message).toBe('Session continued');
  });

  it('should handle validation errors', async () => {
    const args = {
      project_name: '', // Invalid: empty project name
      work_content: 'Did some work',
      new_session: true,
    };

    mockStorageManager.createLog.mockRejectedValue(
      new ValidationError('Project name cannot be empty', 'projectName', '')
    );

    const result = await createLogTool(mockStorageManager, args);

    const responseContent = JSON.parse(result.content[0]!.text);
    expect(responseContent.success).toBe(false);
    expect(responseContent.error.type).toBe('ValidationError');
    expect(responseContent.error.message).toContain(
      'project_name is required and must be a string'
    );
  });

  it('should handle storage errors', async () => {
    const args = {
      project_name: 'test-project',
      work_content: 'Did some work',
      new_session: true,
    };

    mockStorageManager.createLog.mockRejectedValue(new Error('Database connection failed'));

    const result = await createLogTool(mockStorageManager, args);

    const responseContent = JSON.parse(result.content[0]!.text);
    expect(responseContent.success).toBe(false);
    expect(responseContent.error.type).toBe('Error');
    expect(responseContent.error.message).toBe('Database connection failed');
  });

  describe('Session Management', () => {
    it('should require either session_id or new_session=true', async () => {
      const args = {
        project_name: 'test-project',
        work_content: 'Did some work',
        // Neither session_id nor new_session provided
      };

      const result = await createLogTool(mockStorageManager, args);

      const responseContent = JSON.parse(result.content[0]!.text);
      expect(responseContent.success).toBe(false);
      expect(responseContent.error.type).toBe('ValidationError');
      expect(responseContent.error.message).toContain(
        'Either session_id or new_session=true must be provided'
      );
      expect(mockStorageManager.createLog).not.toHaveBeenCalled();
    });

    it('should reject when both session_id and new_session are provided', async () => {
      const args = {
        project_name: 'test-project',
        work_content: 'Did some work',
        session_id: 'existing-session',
        new_session: true,
      };

      const result = await createLogTool(mockStorageManager, args);

      const responseContent = JSON.parse(result.content[0]!.text);
      expect(responseContent.success).toBe(false);
      expect(responseContent.error.type).toBe('ValidationError');
      expect(responseContent.error.message).toContain(
        'Cannot specify both session_id and new_session=true'
      );
      expect(mockStorageManager.createLog).not.toHaveBeenCalled();
    });

    it('should continue existing session when session_id provided', async () => {
      const mockResponse = {
        logId: 'test-log-id',
        sessionId: 'existing-session',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      mockStorageManager.createLog.mockResolvedValue(mockResponse);
      (mockStorageManager.getSessionLogs as any).mockResolvedValue({
        logs: [{ sessionId: 'existing-session', projectName: 'test-project' }],
        sessionSummary: {},
      });

      const args = {
        project_name: 'test-project',
        work_content: 'Continuing work',
        session_id: 'existing-session',
      };

      const result = await createLogTool(mockStorageManager, args);

      expect(mockStorageManager.createLog).toHaveBeenCalledWith({
        projectName: 'test-project',
        workContent: 'Continuing work',
        sessionId: 'existing-session',
      });

      const responseContent = JSON.parse(result.content[0]!.text);
      expect(responseContent.sessionId).toBe('existing-session');
      expect(responseContent.message).toBe('Session continued');
    });

    it('should create new session when new_session=true', async () => {
      const mockResponse = {
        logId: 'test-log-id',
        sessionId: 'claude-code-test-project-2024-01-01-123456',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      mockStorageManager.createLog.mockResolvedValue(mockResponse);

      const args = {
        project_name: 'test-project',
        work_content: 'Starting new work',
        new_session: true,
      };

      const result = await createLogTool(mockStorageManager, args);

      expect(mockStorageManager.createLog).toHaveBeenCalledWith({
        projectName: 'test-project',
        workContent: 'Starting new work',
        sessionId: expect.stringMatching(/^claude-code-test-project-\d{4}-\d{2}-\d{2}-\d+$/),
      });

      const responseContent = JSON.parse(result.content[0]!.text);
      expect(responseContent.sessionId).toMatch(/^claude-code-test-project-\d{4}-\d{2}-\d{2}-\d+$/);
      expect(responseContent.message).toBe('New session created');
    });

    it('should warn when session does not exist but continue anyway', async () => {
      const mockResponse = {
        logId: 'test-log-id',
        sessionId: 'non-existent-session',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      mockStorageManager.createLog.mockResolvedValue(mockResponse);
      (mockStorageManager.getSessionLogs as any).mockResolvedValue({
        logs: [],
        sessionSummary: {},
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const args = {
        project_name: 'test-project',
        work_content: 'Using non-existent session',
        session_id: 'non-existent-session',
      };

      await createLogTool(mockStorageManager, args);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WARNING: Session non-existent-session has no existing logs'
      );
      expect(mockStorageManager.createLog).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should warn when session exists but has no logs for current project', async () => {
      const mockResponse = {
        logId: 'test-log-id',
        sessionId: 'other-project-session',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      mockStorageManager.createLog.mockResolvedValue(mockResponse);
      (mockStorageManager.getSessionLogs as any).mockResolvedValue({
        logs: [{ sessionId: 'other-project-session', projectName: 'different-project' }],
        sessionSummary: {},
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const args = {
        project_name: 'test-project',
        work_content: 'Using session from different project',
        session_id: 'other-project-session',
      };

      await createLogTool(mockStorageManager, args);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WARNING: Session other-project-session has no logs for project test-project'
      );
      expect(mockStorageManager.createLog).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
