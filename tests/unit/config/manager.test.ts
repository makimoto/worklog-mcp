import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigManager } from '../../../src/config/manager';
import fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const defaultConfig = configManager.getDefaultConfig();

      expect(defaultConfig).toEqual({
        database: {
          path: './worklog.db',
          backupEnabled: true,
          backupRetention: 30,
        },
        display: {
          defaultFormat: 'table',
          defaultLimit: 20,
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
        },
        session: {
          autoGenerate: true,
          defaultTimeout: 3600,
        },
        output: {
          colors: true,
          verbose: false,
        },
      });
    });
  });

  describe('loadConfig', () => {
    it('should load default config when no config files exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const config = await configManager.loadConfig();
      const defaultConfig = configManager.getDefaultConfig();

      expect(config).toEqual(defaultConfig);
    });

    it('should merge user config with default config', async () => {
      const userConfig = {
        display: {
          defaultFormat: 'json' as const,
          defaultLimit: 50,
        },
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(userConfig));

      const config = await configManager.loadConfig();

      expect(config.display.defaultFormat).toBe('json');
      expect(config.display.defaultLimit).toBe(50);
      expect(config.database.path).toBe('./worklog.db'); // Default value preserved
    });

    it('should prioritize project config over user config', async () => {
      const userConfig = {
        display: { defaultFormat: 'json' as const },
      };
      const projectConfig = {
        display: { defaultFormat: 'table' as const },
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(userConfig)) // User config
        .mockResolvedValueOnce(JSON.stringify(projectConfig)); // Project config

      const config = await configManager.loadConfig();

      expect(config.display.defaultFormat).toBe('table'); // Project config wins
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('invalid json');

      const config = await configManager.loadConfig();
      const defaultConfig = configManager.getDefaultConfig();

      expect(config).toEqual(defaultConfig);
    });
  });

  describe('loadEnvironmentConfig', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env['WORKLOG_DB_PATH'];
      delete process.env['WORKLOG_DEFAULT_FORMAT'];
      delete process.env['WORKLOG_DEFAULT_LIMIT'];
    });

    it('should load config from environment variables', () => {
      process.env['WORKLOG_DB_PATH'] = '/custom/path/worklog.db';
      process.env['WORKLOG_DEFAULT_FORMAT'] = 'json';
      process.env['WORKLOG_DEFAULT_LIMIT'] = '100';

      const envConfig = configManager.loadEnvironmentConfig();

      expect(envConfig.database?.path).toBe('/custom/path/worklog.db');
      expect(envConfig.display?.defaultFormat).toBe('json');
      expect(envConfig.display?.defaultLimit).toBe(100);
    });

    it('should return empty config when no environment variables set', () => {
      const envConfig = configManager.loadEnvironmentConfig();

      expect(envConfig).toEqual({});
    });
  });

  describe('saveUserConfig', () => {
    it('should save user configuration to file', async () => {
      const configUpdate = {
        display: {
          defaultFormat: 'markdown' as const,
          defaultLimit: 25,
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
        },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await configManager.saveUserConfig(configUpdate);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify(configUpdate, null, 2)
      );
    });

    it('should create config directory if it does not exist', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await configManager.saveUserConfig({});

      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('getConfigValue', () => {
    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      await configManager.loadConfig();
    });

    it('should get nested config value', () => {
      const value = configManager.getConfigValue('display.defaultFormat');
      expect(value).toBe('table');
    });

    it('should return undefined for non-existent key', () => {
      const value = configManager.getConfigValue('nonexistent.key');
      expect(value).toBeUndefined();
    });
  });

  describe('setConfigValue', () => {
    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      await configManager.loadConfig();
    });

    it('should set nested config value and save', async () => {
      await configManager.setConfigValue('display.defaultFormat', 'json');

      const value = configManager.getConfigValue('display.defaultFormat');
      expect(value).toBe('json');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create nested object if path does not exist', async () => {
      await configManager.setConfigValue('new.nested.key', 'value');

      const value = configManager.getConfigValue('new.nested.key');
      expect(value).toBe('value');
    });
  });

  describe('resetConfig', () => {
    it('should reset to default configuration', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await configManager.resetConfig();

      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });
});
