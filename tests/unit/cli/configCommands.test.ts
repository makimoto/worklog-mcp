import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { configCommand, summaryCommand } from '../../../src/cli/configCommands';
import type { StorageManager } from '../../../src/storage/manager';
import type { ConfigManager } from '../../../src/config/manager';

// Mock modules
jest.mock('../../../src/config/manager');

describe('CLI Config Commands', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(() => {
    mockStorageManager = {
      getLogs: jest.fn(),
    } as unknown as jest.Mocked<StorageManager>;

    mockConfigManager = {
      loadConfig: jest.fn(),
      getConfigValue: jest.fn(),
      setConfigValue: jest.fn(),
      resetConfig: jest.fn(),
      getDefaultConfig: jest.fn(),
    } as unknown as jest.Mocked<ConfigManager>;

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('config command', () => {
    describe('show subcommand', () => {
      it('should display current configuration', async () => {
        const mockConfig = {
          database: { path: './worklog.db', backupEnabled: true, backupRetention: 30 },
          display: {
            defaultFormat: 'table' as const,
            defaultLimit: 20,
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
          },
          session: { autoGenerate: true, defaultTimeout: 3600 },
          output: { colors: true, verbose: false },
        };

        mockConfigManager.loadConfig.mockResolvedValue(mockConfig);

        await configCommand(mockConfigManager, 'show', []);

        expect(mockConfigManager.loadConfig).toHaveBeenCalled();
        expect(mockConsoleLog).toHaveBeenCalledWith('Current Configuration:');
        expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
      });

      it('should display configuration in table format', async () => {
        const mockConfig = {
          database: { path: './worklog.db', backupEnabled: true, backupRetention: 30 },
          display: {
            defaultFormat: 'table' as const,
            defaultLimit: 20,
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
          },
          session: { autoGenerate: true, defaultTimeout: 3600 },
          output: { colors: true, verbose: false },
        };

        mockConfigManager.loadConfig.mockResolvedValue(mockConfig);

        await configCommand(mockConfigManager, 'show', [], { format: 'table' });

        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('┌'));
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('database.path'));
      });
    });

    describe('get subcommand', () => {
      it('should get specific configuration value', async () => {
        mockConfigManager.getConfigValue.mockReturnValue('table');

        await configCommand(mockConfigManager, 'get', ['display.defaultFormat']);

        expect(mockConfigManager.loadConfig).toHaveBeenCalled();
        expect(mockConfigManager.getConfigValue).toHaveBeenCalledWith('display.defaultFormat');
        expect(mockConsoleLog).toHaveBeenCalledWith('table');
      });

      it('should handle non-existent configuration key', async () => {
        mockConfigManager.getConfigValue.mockReturnValue(undefined);

        await configCommand(mockConfigManager, 'get', ['nonexistent.key']);

        expect(mockConsoleError).toHaveBeenCalledWith(
          'Configuration key not found: nonexistent.key'
        );
      });

      it('should require configuration key argument', async () => {
        await configCommand(mockConfigManager, 'get', []);

        expect(mockConsoleError).toHaveBeenCalledWith('Configuration key is required');
      });
    });

    describe('set subcommand', () => {
      it('should set configuration value', async () => {
        await configCommand(mockConfigManager, 'set', ['display.defaultFormat', 'json']);

        expect(mockConfigManager.loadConfig).toHaveBeenCalled();
        expect(mockConfigManager.setConfigValue).toHaveBeenCalledWith(
          'display.defaultFormat',
          'json'
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Configuration updated: display.defaultFormat = json'
        );
      });

      it('should handle numeric values', async () => {
        await configCommand(mockConfigManager, 'set', ['display.defaultLimit', '50']);

        expect(mockConfigManager.setConfigValue).toHaveBeenCalledWith('display.defaultLimit', 50);
      });

      it('should handle boolean values', async () => {
        await configCommand(mockConfigManager, 'set', ['database.backupEnabled', 'false']);

        expect(mockConfigManager.setConfigValue).toHaveBeenCalledWith(
          'database.backupEnabled',
          false
        );
      });

      it('should require both key and value arguments', async () => {
        await configCommand(mockConfigManager, 'set', ['display.defaultFormat']);

        expect(mockConsoleError).toHaveBeenCalledWith(
          'Both configuration key and value are required'
        );
      });
    });

    describe('reset subcommand', () => {
      it('should reset configuration to defaults', async () => {
        await configCommand(mockConfigManager, 'reset', []);

        expect(mockConfigManager.resetConfig).toHaveBeenCalled();
        expect(mockConsoleLog).toHaveBeenCalledWith('Configuration reset to defaults');
      });
    });

    describe('error handling', () => {
      it('should handle invalid subcommand', async () => {
        await configCommand(mockConfigManager, 'invalid', []);

        expect(mockConsoleError).toHaveBeenCalledWith('Invalid config subcommand: invalid');
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Available subcommands: show, get, set, reset'
        );
      });

      it('should handle configuration errors', async () => {
        mockConfigManager.loadConfig.mockRejectedValue(new Error('Config load failed'));

        await configCommand(mockConfigManager, 'show', []);

        expect(mockConsoleError).toHaveBeenCalledWith('Configuration error:', 'Config load failed');
      });
    });
  });

  describe('summary command', () => {
    const mockLogs = [
      {
        logId: 'log1',
        timestamp: '2024-01-01T10:00:00.000Z',
        sessionId: 'session1',
        projectName: 'project-a',
        workContent: 'Work on feature A',
        successes: 'Feature completed',
        failures: undefined,
        blockers: undefined,
        thoughts: undefined,
      },
      {
        logId: 'log2',
        timestamp: '2024-01-01T14:00:00.000Z',
        sessionId: 'session1',
        projectName: 'project-a',
        workContent: 'Testing feature A',
        successes: 'Tests passing',
        failures: 'Found one bug',
        blockers: undefined,
        thoughts: undefined,
      },
      {
        logId: 'log3',
        timestamp: '2024-01-02T09:00:00.000Z',
        sessionId: 'session2',
        projectName: 'project-b',
        workContent: 'Started project B',
        successes: 'Initial setup done',
        failures: undefined,
        blockers: undefined,
        thoughts: undefined,
      },
    ];

    beforeEach(() => {
      mockStorageManager.getLogs.mockResolvedValue({
        logs: mockLogs,
        totalCount: 3,
        hasMore: false,
      });
    });

    it('should display overall summary statistics', async () => {
      await summaryCommand(mockStorageManager, {});

      expect(mockConsoleLog).toHaveBeenCalledWith('Work Log Summary');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Total Logs: 3'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Projects: 2'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Sessions: 2'));
    });

    it('should display project breakdown', async () => {
      await summaryCommand(mockStorageManager, {});

      expect(mockConsoleLog).toHaveBeenCalledWith('Project Breakdown:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  project-a: 2 logs');
      expect(mockConsoleLog).toHaveBeenCalledWith('  project-b: 1 logs');
    });

    it('should display success/failure analysis', async () => {
      await summaryCommand(mockStorageManager, {});

      expect(mockConsoleLog).toHaveBeenCalledWith('Activity Analysis:');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Logs with successes: 3 (100%)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Logs with failures: 1 (33%)');
      expect(mockConsoleLog).toHaveBeenCalledWith('  Logs with blockers: 0 (0%)');
    });

    it('should filter by project when specified', async () => {
      await summaryCommand(mockStorageManager, { project: 'project-a' });

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: 'project-a' })
      );
    });

    it('should display summary in table format', async () => {
      await summaryCommand(mockStorageManager, { format: 'table' });

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('┌'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('project-a'));
    });

    it('should display summary in JSON format', async () => {
      await summaryCommand(mockStorageManager, { format: 'json' });

      const jsonCall = mockConsoleLog.mock.calls.find(
        (call: any[]) => call[0] && typeof call[0] === 'string' && call[0].includes('{')
      );
      expect(jsonCall).toBeDefined();
      expect(() => JSON.parse(jsonCall[0])).not.toThrow();
    });

    it('should handle period filtering', async () => {
      await summaryCommand(mockStorageManager, { period: 'week' });

      expect(mockStorageManager.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        })
      );
    });

    it('should handle empty logs gracefully', async () => {
      mockStorageManager.getLogs.mockResolvedValue({
        logs: [],
        totalCount: 0,
        hasMore: false,
      });

      await summaryCommand(mockStorageManager, {});

      expect(mockConsoleLog).toHaveBeenCalledWith('No logs found for summary');
    });

    it('should handle storage errors', async () => {
      mockStorageManager.getLogs.mockRejectedValue(new Error('Storage error'));

      await summaryCommand(mockStorageManager, {});

      expect(mockConsoleError).toHaveBeenCalledWith('Error generating summary:', 'Storage error');
    });
  });
});
