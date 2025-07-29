import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { listCommand, showCommand, searchCommand } from '../../../src/cli/commands';
import type { StorageManager } from '../../../src/storage/manager';

describe('CLI Commands', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(() => {
    mockStorageManager = {
      getLogs: jest.fn(),
      getSessionLogs: jest.fn(),
      searchLogs: jest.fn(),
      getRecentSessions: jest.fn(),
      getLatestSession: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('list command', () => {
    it('should list logs with default options', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'Test work',
            successes: 'Success',
            failures: null,
            blockers: null,
            thoughts: 'Thoughts',
          } as any,
        ],
        totalCount: 1,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, {});

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('Work Logs (1 total)');
      expect(mockConsoleLog).toHaveBeenCalledWith('');
    });

    it('should list logs with project filter', async () => {
      const mockResponse = {
        logs: [],
        totalCount: 0,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, { project: 'test-project' });

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith({
        projectName: 'test-project',
        limit: 20,
        offset: 0,
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('Work Logs (0 total)');
      expect(mockConsoleLog).toHaveBeenCalledWith('No logs found.');
    });

    it('should list logs with custom limit', async () => {
      const mockResponse = {
        logs: [],
        totalCount: 0,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, { limit: 10 });

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    it('should handle storage errors', async () => {
      mockStorageManager.getLogs.mockRejectedValue(new Error('Storage error'));

      await listCommand(mockStorageManager, {});

      expect(mockConsoleError).toHaveBeenCalledWith('Error listing logs:', 'Storage error');
    });

    it('should format logs as table', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'Test work',
          } as any,
        ],
        totalCount: 1,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, { format: 'table' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('│ #   │ Timestamp        │ Project')
      );
    });

    it('should format logs as JSON', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'Test work',
          } as any,
        ],
        totalCount: 1,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, { format: 'json' });

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"logs":'));
    });

    it('should format logs as markdown', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'Test work',
          } as any,
        ],
        totalCount: 1,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, { format: 'markdown' });

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('# Work Logs'));
    });

    it('should handle invalid format', async () => {
      const mockResponse = {
        logs: [],
        totalCount: 0,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      await listCommand(mockStorageManager, { format: 'invalid' });

      expect(mockConsoleError).toHaveBeenCalledWith('Invalid format: invalid');
      expect(mockConsoleError).toHaveBeenCalledWith('Supported formats: table, json, markdown');
    });
  });

  describe('show command', () => {
    it('should show session logs', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'test-session',
            projectName: 'project1',
            workContent: 'Test work',
            successes: 'Success',
            failures: null,
            blockers: null,
            thoughts: 'Thoughts',
          } as any,
        ],
        sessionSummary: {
          sessionId: 'test-session',
          totalLogs: 1,
          dateRange: {
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      mockStorageManager.getSessionLogs.mockResolvedValue(mockResponse);

      await showCommand(mockStorageManager, 'test-session');

      expect(mockStorageManager.getSessionLogs).toHaveBeenCalledWith('test-session');
      expect(mockConsoleLog).toHaveBeenCalledWith('Session: test-session');
      expect(mockConsoleLog).toHaveBeenCalledWith('Total logs: 1');
    });

    it('should handle missing session ID', async () => {
      await showCommand(mockStorageManager, '');

      expect(mockConsoleError).toHaveBeenCalledWith('Session ID is required');
      expect(mockStorageManager.getSessionLogs).not.toHaveBeenCalled();
    });

    it('should handle storage errors', async () => {
      mockStorageManager.getSessionLogs.mockRejectedValue(new Error('Session not found'));

      await showCommand(mockStorageManager, 'test-session');

      expect(mockConsoleError).toHaveBeenCalledWith('Error showing session:', 'Session not found');
    });

    it('should format session logs as table', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'test-session',
            projectName: 'project1',
            workContent: 'Test work',
          } as any,
        ],
        sessionSummary: {
          sessionId: 'test-session',
          totalLogs: 1,
          dateRange: {
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      mockStorageManager.getSessionLogs.mockResolvedValue(mockResponse);

      await showCommand(mockStorageManager, 'test-session', { format: 'table' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('│ #   │ Timestamp        │ Project')
      );
    });
  });

  describe('search command', () => {
    it('should search logs with query', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'Test authentication work',
            successes: 'Success',
            failures: null,
            blockers: null,
            thoughts: 'Thoughts',
          } as any,
        ],
        totalMatches: 1,
      };

      mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

      await searchCommand(mockStorageManager, 'authentication', {});

      expect(mockStorageManager.searchLogs).toHaveBeenCalledWith('authentication', undefined, 20);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Search Results for "authentication" (1 matches)'
      );
    });

    it('should search logs with fields filter', async () => {
      const mockResponse = {
        logs: [],
        totalMatches: 0,
      };

      mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

      await searchCommand(mockStorageManager, 'bug', { fields: ['work_content', 'failures'] });

      expect(mockStorageManager.searchLogs).toHaveBeenCalledWith(
        'bug',
        ['work_content', 'failures'],
        20
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('Search Results for "bug" (0 matches)');
      expect(mockConsoleLog).toHaveBeenCalledWith('No matching logs found.');
    });

    it('should handle missing query', async () => {
      await searchCommand(mockStorageManager, '', {});

      expect(mockConsoleError).toHaveBeenCalledWith('Search query is required');
      expect(mockStorageManager.searchLogs).not.toHaveBeenCalled();
    });

    it('should handle storage errors', async () => {
      mockStorageManager.searchLogs.mockRejectedValue(new Error('Search failed'));

      await searchCommand(mockStorageManager, 'test', {});

      expect(mockConsoleError).toHaveBeenCalledWith('Error searching logs:', 'Search failed');
    });

    it('should format search results as JSON', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'Test authentication work',
          } as any,
        ],
        totalMatches: 1,
      };

      mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

      await searchCommand(mockStorageManager, 'authentication', { format: 'json' });

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"logs":'));
    });
  });

  describe('sessionListCommand', () => {
    it('should list recent sessions', async () => {
      const mockSessions = [
        {
          sessionId: 'session-1',
          projectName: 'project1',
          lastActivity: '2024-01-02T00:00:00.000Z',
          logCount: 5,
        },
        {
          sessionId: 'session-2',
          projectName: 'project2',
          lastActivity: '2024-01-01T00:00:00.000Z',
          logCount: 3,
        },
      ];

      // Mock the session listing method we'll implement
      (mockStorageManager.getRecentSessions as any).mockResolvedValue(mockSessions);

      const { sessionListCommand } = await import('../../../src/cli/commands');
      await sessionListCommand(mockStorageManager, {});

      expect(mockStorageManager.getRecentSessions).toHaveBeenCalledWith({
        limit: 10,
        projectName: undefined,
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('Recent Sessions:');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('session-1'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('project1'));
    });

    it('should filter sessions by project', async () => {
      const mockSessions = [
        {
          sessionId: 'session-1',
          projectName: 'project1',
          lastActivity: '2024-01-02T00:00:00.000Z',
          logCount: 5,
        },
      ];

      (mockStorageManager.getRecentSessions as any).mockResolvedValue(mockSessions);

      const { sessionListCommand } = await import('../../../src/cli/commands');
      await sessionListCommand(mockStorageManager, { project: 'project1', limit: 5 });

      expect(mockStorageManager.getRecentSessions).toHaveBeenCalledWith({
        limit: 5,
        projectName: 'project1',
      });
    });

    it('should format sessions as JSON', async () => {
      const mockSessions = [
        {
          sessionId: 'session-1',
          projectName: 'project1',
          lastActivity: '2024-01-02T00:00:00.000Z',
          logCount: 5,
        },
      ];

      (mockStorageManager.getRecentSessions as any).mockResolvedValue(mockSessions);

      const { sessionListCommand } = await import('../../../src/cli/commands');
      await sessionListCommand(mockStorageManager, { format: 'json' });

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"sessionId"'));
    });

    it('should handle empty sessions list', async () => {
      (mockStorageManager.getRecentSessions as any).mockResolvedValue([]);

      const { sessionListCommand } = await import('../../../src/cli/commands');
      await sessionListCommand(mockStorageManager, {});

      expect(mockConsoleLog).toHaveBeenCalledWith('No recent sessions found.');
    });

    it('should handle storage errors', async () => {
      (mockStorageManager.getRecentSessions as any).mockRejectedValue(new Error('Database error'));

      const { sessionListCommand } = await import('../../../src/cli/commands');
      await sessionListCommand(mockStorageManager, {});

      expect(mockConsoleError).toHaveBeenCalledWith('Error listing sessions:', 'Database error');
    });
  });

  describe('sessionLatestCommand', () => {
    it('should show the latest session for a project', async () => {
      const mockSession = {
        sessionId: 'latest-session',
        projectName: 'project1',
        lastActivity: '2024-01-02T00:00:00.000Z',
        logCount: 3,
      };

      (mockStorageManager.getLatestSession as any).mockResolvedValue(mockSession);

      const { sessionLatestCommand } = await import('../../../src/cli/commands');
      await sessionLatestCommand(mockStorageManager, 'project1', {});

      expect(mockStorageManager.getLatestSession).toHaveBeenCalledWith('project1');
      expect(mockConsoleLog).toHaveBeenCalledWith('Latest session for project1:');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('latest-session'));
    });

    it('should handle missing project name', async () => {
      const { sessionLatestCommand } = await import('../../../src/cli/commands');
      await sessionLatestCommand(mockStorageManager, '', {});

      expect(mockConsoleError).toHaveBeenCalledWith('Project name is required');
    });

    it('should handle no sessions found', async () => {
      (mockStorageManager.getLatestSession as any).mockResolvedValue(null);

      const { sessionLatestCommand } = await import('../../../src/cli/commands');
      await sessionLatestCommand(mockStorageManager, 'project1', {});

      expect(mockConsoleLog).toHaveBeenCalledWith('No sessions found for project: project1');
    });
  });
});
