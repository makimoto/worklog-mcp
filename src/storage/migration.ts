import type { Database } from 'sqlite3';

/**
 * Database migration definition
 */
export interface Migration {
  version: number;
  description: string;
  sql: string;
}

/**
 * Storage error class
 */
export class StorageError extends Error {
  public override cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

/**
 * Database migrations in order
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    sql: `
      CREATE TABLE work_logs (
        log_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        work_content TEXT NOT NULL,
        successes TEXT,
        failures TEXT,
        blockers TEXT,
        thoughts TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_session_id ON work_logs(session_id);
      CREATE INDEX idx_project_name ON work_logs(project_name);
      CREATE INDEX idx_timestamp ON work_logs(timestamp DESC);
      CREATE INDEX idx_created_at ON work_logs(created_at);

      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

/**
 * Migration manager for database schema updates
 */
export class MigrationManager {
  constructor(private db: Database) {}

  /**
   * Get current schema version
   */
  async getCurrentVersion(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Check if migrations table exists
      this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
        (err, row) => {
          if (err) {
            reject(new StorageError('Failed to check migrations table', err));
            return;
          }

          if (!row) {
            resolve(0); // No migrations table means version 0
            return;
          }

          // Get latest version
          this.db.get(
            'SELECT MAX(version) as version FROM schema_migrations',
            (err, row: { version?: number }) => {
              if (err) {
                reject(new StorageError('Failed to get current version', err));
                return;
              }
              resolve(row?.version ?? 0);
            }
          );
        }
      );
    });
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        // Execute migration SQL
        this.db.exec(migration.sql, (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(new StorageError(`Failed to apply migration ${migration.version}`, err));
            return;
          }

          // Record migration
          this.db.run(
            'INSERT INTO schema_migrations (version) VALUES (?)',
            [migration.version],
            (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(new StorageError(`Failed to record migration ${migration.version}`, err));
                return;
              }

              this.db.run('COMMIT', (err) => {
                if (err) {
                  reject(new StorageError(`Failed to commit migration ${migration.version}`, err));
                  return;
                }
                resolve();
              });
            }
          );
        });
      });
    });
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      return; // No migrations to run
    }

    // Sort by version to ensure correct order
    pendingMigrations.sort((a, b) => a.version - b.version);

    for (const migration of pendingMigrations) {
      console.warn(`Applying migration ${migration.version}: ${migration.description}`);
      await this.applyMigration(migration);
    }

    console.warn(`Applied ${pendingMigrations.length} migrations successfully`);
  }

  /**
   * Initialize database with basic SQLite settings
   */
  async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Configure SQLite for better performance and reliability
        this.db.run('PRAGMA busy_timeout = 5000', (err) => {
          if (err) {
            reject(new StorageError('Failed to set busy timeout', err));
            return;
          }
        });

        this.db.run('PRAGMA synchronous = NORMAL', (err) => {
          if (err) {
            reject(new StorageError('Failed to set synchronous mode', err));
            return;
          }
        });

        this.db.run('PRAGMA temp_store = MEMORY', (err) => {
          if (err) {
            reject(new StorageError('Failed to set temp store', err));
            return;
          }
          resolve();
        });
      });
    });
  }
}
