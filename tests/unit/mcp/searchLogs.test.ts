import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { searchLogsTool } from '../../../src/mcp/tools/searchLogs';
import type { StorageManager } from '../../../src/storage/manager';

describe('search_logs tool', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;

  beforeEach(() => {
    mockStorageManager = {
      searchLogs: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;
  });

  it('should search logs with basic query', async () => {
    const mockResponse = {
      logs: [
        {
          logId: 'log1',
          timestamp: '2024-01-01T00:00:00.000Z',
          sessionId: 'session1',
          projectName: 'project1',
          workContent: 'Fixed authentication bug',
        },
      ],
      totalMatches: 1,
    };

    mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

    const result = await searchLogsTool(mockStorageManager, {
      query: 'authentication',
    });

    expect(mockStorageManager.searchLogs).toHaveBeenCalledWith('authentication', undefined, 50);

    expect(result.content[0]?.text).toContain('authentication');
    expect(result.content[0]?.text).toContain('totalMatches');
  });

  it('should search logs with specific fields', async () => {
    const mockResponse = {
      logs: [],
      totalMatches: 0,
    };

    mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

    const result = await searchLogsTool(mockStorageManager, {
      query: 'bug',
      fields: ['work_content', 'failures'],
    });

    expect(mockStorageManager.searchLogs).toHaveBeenCalledWith(
      'bug',
      ['work_content', 'failures'],
      50
    );

    expect(result.content[0]?.text).toContain('totalMatches": 0');
  });

  it('should search logs with custom limit', async () => {
    const mockResponse = {
      logs: [],
      totalMatches: 0,
    };

    mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

    const result = await searchLogsTool(mockStorageManager, {
      query: 'test',
      limit: 10,
    });

    expect(mockStorageManager.searchLogs).toHaveBeenCalledWith('test', undefined, 10);

    expect(result.content[0]?.text).toContain('totalMatches');
  });

  it('should handle missing query parameter', async () => {
    const result = await searchLogsTool(mockStorageManager, {});

    expect(result.content[0]?.text).toContain('error');
    expect(result.content[0]?.text).toContain('query is required');
  });

  it('should handle invalid limit parameter', async () => {
    const result = await searchLogsTool(mockStorageManager, {
      query: 'test',
      limit: 'invalid',
    });

    expect(result.content[0]?.text).toContain('error');
    expect(result.content[0]?.text).toContain('limit must be a number');
  });

  it('should handle storage errors', async () => {
    mockStorageManager.searchLogs.mockRejectedValue(new Error('Search failed'));

    const result = await searchLogsTool(mockStorageManager, {
      query: 'test',
    });

    expect(result.content[0]?.text).toContain('error');
    expect(result.content[0]?.text).toContain('Search failed');
  });

  it('should handle string for fields parameter', async () => {
    const mockResponse = {
      logs: [],
      totalMatches: 0,
    };

    mockStorageManager.searchLogs.mockResolvedValue(mockResponse);

    const result = await searchLogsTool(mockStorageManager, {
      query: 'test',
      fields: ['work_content'], // Pass as array like validation expects
    });

    expect(mockStorageManager.searchLogs).toHaveBeenCalledWith('test', ['work_content'], 50);

    expect(result.content[0]?.text).toContain('totalMatches');
  });
});
