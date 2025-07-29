export interface DatabaseConfig {
  path: string;
  backupEnabled: boolean;
  backupRetention: number;
}

export interface DisplayConfig {
  defaultFormat: 'table' | 'json' | 'markdown';
  defaultLimit: number;
  timezone: string;
  dateFormat: string;
}

export interface SessionConfig {
  autoGenerate: boolean;
  defaultTimeout: number;
}

export interface OutputConfig {
  colors: boolean;
  verbose: boolean;
}

export interface Config {
  database: DatabaseConfig;
  display: DisplayConfig;
  session: SessionConfig;
  output: OutputConfig;
}

export interface ConfigPaths {
  userConfigPath: string;
  projectConfigPath: string;
}
