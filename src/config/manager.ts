import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config } from './types';

export class ConfigManager {
  private config: Config | null = null;
  private readonly userConfigPath: string;
  private readonly projectConfigPath: string;

  constructor() {
    this.userConfigPath = path.join(os.homedir(), '.worklog', 'config.json');
    this.projectConfigPath = path.join(process.cwd(), '.worklog', 'config.json');
  }
  getDefaultConfig(): Config {
    return {
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
    };
  }

  async loadConfig(): Promise<Config> {
    const defaultConfig = this.getDefaultConfig();
    const userConfig = await this.loadUserConfig();
    const projectConfig = await this.loadProjectConfig();
    const envConfig = this.loadEnvironmentConfig();

    this.config = this.mergeConfigs(defaultConfig, userConfig, projectConfig, envConfig);
    return this.config;
  }

  private async loadUserConfig(): Promise<Partial<Config>> {
    try {
      await fs.access(this.userConfigPath);
      const content = await fs.readFile(this.userConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async loadProjectConfig(): Promise<Partial<Config>> {
    try {
      await fs.access(this.projectConfigPath);
      const content = await fs.readFile(this.projectConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private mergeConfigs(...configs: Partial<Config>[]): Config {
    const result = {} as Config;
    for (const config of configs) {
      this.deepMerge(result, config);
    }
    return result;
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  loadEnvironmentConfig(): Partial<Config> {
    const config: any = {};

    if (process.env['WORKLOG_DB_PATH']) {
      config.database = { path: process.env['WORKLOG_DB_PATH'] };
    }

    if (process.env['WORKLOG_DEFAULT_FORMAT']) {
      const format = process.env['WORKLOG_DEFAULT_FORMAT'];
      if (format === 'table' || format === 'json' || format === 'markdown') {
        if (!config.display) config.display = {};
        config.display.defaultFormat = format;
      }
    }

    if (process.env['WORKLOG_DEFAULT_LIMIT']) {
      const limit = parseInt(process.env['WORKLOG_DEFAULT_LIMIT'], 10);
      if (!isNaN(limit)) {
        if (!config.display) config.display = {};
        config.display.defaultLimit = limit;
      }
    }

    return config;
  }

  async saveUserConfig(config: Partial<Config>): Promise<void> {
    const configDir = path.dirname(this.userConfigPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(this.userConfigPath, JSON.stringify(config, null, 2));
  }

  getConfigValue(key: string): any {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.getNestedValue(this.config, key);
  }

  async setConfigValue(key: string, value: any): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    let userConfig = await this.loadUserConfig();
    this.setNestedValue(userConfig, key, value);
    await this.saveUserConfig(userConfig);
    this.setNestedValue(this.config, key, value);
  }

  async resetConfig(): Promise<void> {
    try {
      await fs.unlink(this.userConfigPath);
    } catch {
      // File doesn't exist, ignore
    }
    this.config = this.getDefaultConfig();
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, prop) => {
      if (!current[prop]) {
        current[prop] = {};
      }
      return current[prop];
    }, obj);
    target[lastKey] = value;
  }
}
