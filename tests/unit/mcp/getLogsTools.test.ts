import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getLogsTool, getSessionLogsTool } from '../../../src/mcp/tools/getLogs';
import type { StorageManager } from '../../../src/storage/manager';

describe('get_logs and get_session_logs tools', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;

  beforeEach(() => {
    mockStorageManager = {
      getLogs: jest.fn(),
      getSessionLogs: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;
  });

  describe('get_logs tool', () => {
    it('should get logs with default parameters', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'session1',
            projectName: 'project1',
            workContent: 'work1',
          },
        ],
        totalCount: 1,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      const result = await getLogsTool(mockStorageManager, {});

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });

      expect(result.content[0]?.text).toContain('log1');
      expect(result.content[0]?.text).toContain('totalCount');
    });

    it('should get logs with filtering parameters', async () => {
      const mockResponse = {
        logs: [],
        totalCount: 0,
        hasMore: false,
      };

      mockStorageManager.getLogs.mockResolvedValue(mockResponse);

      const result = await getLogsTool(mockStorageManager, {
        project_name: 'test-project',
        session_id: 'test-session',
        limit: 10,
        offset: 20,
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-02T00:00:00.000Z',
      });

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith({
        projectName: 'test-project',
        sessionId: 'test-session',
        limit: 10,
        offset: 20,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-02T00:00:00.000Z',
      });

      expect(result.content[0]?.text).toContain('totalCount": 0');
    });

    it('should handle invalid limit parameter', async () => {
      const result = await getLogsTool(mockStorageManager, {
        limit: 'invalid',
      });

      expect(result.content[0]?.text).toContain('error');
      expect(result.content[0]?.text).toContain('limit must be a number');
    });

    it('should handle storage errors', async () => {
      mockStorageManager.getLogs.mockRejectedValue(new Error('Storage failed'));

      const result = await getLogsTool(mockStorageManager, {});

      expect(result.content[0]?.text).toContain('error');
      expect(result.content[0]?.text).toContain('Storage failed');
    });
  });

  describe('get_session_logs tool', () => {
    it('should get logs for a specific session', async () => {
      const mockResponse = {
        logs: [
          {
            logId: 'log1',
            timestamp: '2024-01-01T00:00:00.000Z',
            sessionId: 'test-session',
            projectName: 'project1',
            workContent: 'work1',
          },
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

      const result = await getSessionLogsTool(mockStorageManager, {
        session_id: 'test-session',
      });

      expect(mockStorageManager.getSessionLogs).toHaveBeenCalledWith('test-session');

      expect(result.content[0]?.text).toContain('test-session');
      expect(result.content[0]?.text).toContain('sessionSummary');
    });

    it('should get session logs with limit parameter', async () => {
      const mockResponse = {
        logs: [],
        sessionSummary: {
          sessionId: 'test-session',
          totalLogs: 0,
          dateRange: {
            start: '',
            end: '',
          },
        },
      };

      mockStorageManager.getSessionLogs.mockResolvedValue(mockResponse);

      const result = await getSessionLogsTool(mockStorageManager, {
        session_id: 'test-session',
        limit: 10,
      });

      expect(mockStorageManager.getSessionLogs).toHaveBeenCalledWith('test-session');
      expect(result.content[0]?.text).toContain('sessionSummary');
    });

    it('should handle missing session_id parameter', async () => {
      const result = await getSessionLogsTool(mockStorageManager, {});

      expect(result.content[0]?.text).toContain('error');
      expect(result.content[0]?.text).toContain('session_id is required');
    });

    it('should handle storage errors', async () => {
      mockStorageManager.getSessionLogs.mockRejectedValue(new Error('Session not found'));

      const result = await getSessionLogsTool(mockStorageManager, {
        session_id: 'test-session',
      });

      expect(result.content[0]?.text).toContain('error');
      expect(result.content[0]?.text).toContain('Session not found');
    });
  });
});
