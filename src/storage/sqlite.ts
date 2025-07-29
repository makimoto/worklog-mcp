import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';
import type {
  LogEntry,
  LogFilters,
  CreateLogResponse,
  GetLogsResponse,
  GetSessionLogsResponse,
  SearchLogsResponse,
  ProjectSummary,
} from '../models/types';
import type { StorageInterface } from './interface';
import { MigrationManager, StorageError } from './migration';

/**
 * SQLite implementation of StorageInterface
 */
export class SQLiteStorage implements StorageInterface {
  private db: Database;
  private migrationManager: MigrationManager;
  private isInitialized = false;

  constructor(databasePath: string) {
    // Ensure directory exists
    const dir = path.dirname(databasePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(databasePath);
    this.migrationManager = new MigrationManager(this.db);
  }

  /**
   * Initialize the storage system
   */
  async initializeStorage(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.migrationManager.initializeDatabase();
      await this.migrationManager.runMigrations();
      this.isInitialized = true;
    } catch (error) {
      throw new StorageError('Failed to initialize storage', error as Error);
    }
  }

  /**
   * Create a new log entry
   */
  async createLog(logData: LogEntry): Promise<CreateLogResponse> {
    const insertQuery = `
      INSERT INTO work_logs (
        log_id, timestamp, session_id, project_name, work_content,
        successes, failures, blockers, thoughts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        insertQuery,
        [
          logData.logId,
          logData.timestamp,
          logData.sessionId,
          logData.projectName,
          logData.workContent,
          logData.successes || null,
          logData.failures || null,
          logData.blockers || null,
          logData.thoughts || null,
        ],
        function (err) {
          if (err) {
            reject(new StorageError('Failed to create log entry', err));
            return;
          }

          resolve({
            logId: logData.logId,
            sessionId: logData.sessionId,
            timestamp: logData.timestamp,
          });
        }
      );
    });
  }

  /**
   * Get logs with optional filtering and pagination
   */
  async getLogs(filters: LogFilters): Promise<GetLogsResponse> {
    const { limit = 50, offset = 0, projectName, sessionId, startDate, endDate } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (projectName) {
      conditions.push('project_name = ?');
      params.push(projectName);
    }

    if (sessionId) {
      conditions.push('session_id = ?');
      params.push(sessionId);
    }

    if (startDate) {
      conditions.push('timestamp >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('timestamp <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) as count FROM work_logs ${whereClause}`;

    // Data query
    const dataQuery = `
      SELECT * FROM work_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    return new Promise((resolve, reject) => {
      // Get total count first
      this.db.get(countQuery, params, (err, countRow: { count: number }) => {
        if (err) {
          reject(new StorageError('Failed to get log count', err));
          return;
        }

        const totalCount = countRow.count;

        // Get data
        this.db.all(dataQuery, [...params, limit, offset], (err, rows: LogEntry[]) => {
          if (err) {
            reject(new StorageError('Failed to get logs', err));
            return;
          }

          resolve({
            logs: rows,
            totalCount,
            hasMore: offset + rows.length < totalCount,
          });
        });
      });
    });
  }

  /**
   * Get all logs for a specific session
   */
  async getSessionLogs(sessionId: string): Promise<GetSessionLogsResponse> {
    const logsQuery = `
      SELECT * FROM work_logs 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `;

    const summaryQuery = `
      SELECT 
        COUNT(*) as totalLogs,
        MIN(timestamp) as startDate,
        MAX(timestamp) as endDate
      FROM work_logs 
      WHERE session_id = ?
    `;

    return new Promise((resolve, reject) => {
      // Get logs
      this.db.all(logsQuery, [sessionId], (err, logs: LogEntry[]) => {
        if (err) {
          reject(new StorageError('Failed to get session logs', err));
          return;
        }

        // Get summary
        this.db.get(
          summaryQuery,
          [sessionId],
          (err, summary: { totalLogs: number; startDate: string; endDate: string }) => {
            if (err) {
              reject(new StorageError('Failed to get session summary', err));
              return;
            }

            resolve({
              logs,
              sessionSummary: {
                sessionId,
                totalLogs: summary.totalLogs,
                dateRange: {
                  start: summary.startDate || '',
                  end: summary.endDate || '',
                },
              },
            });
          }
        );
      });
    });
  }

  /**
   * Search logs by content
   */
  async searchLogs(
    query: string,
    fields: string[] = ['work_content', 'successes', 'failures', 'blockers', 'thoughts'],
    limit = 50
  ): Promise<SearchLogsResponse> {
    // Build search conditions for specified fields
    const searchConditions = fields.map((field) => `${field} LIKE ?`).join(' OR ');

    const searchQuery = `
      SELECT * FROM work_logs 
      WHERE ${searchConditions}
      ORDER BY timestamp DESC 
      LIMIT ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count FROM work_logs 
      WHERE ${searchConditions}
    `;

    const searchPattern = `%${query}%`;
    const params = Array(fields.length).fill(searchPattern);

    return new Promise((resolve, reject) => {
      // Get count
      this.db.get(countQuery, params, (err, countRow: { count: number }) => {
        if (err) {
          reject(new StorageError('Failed to count search results', err));
          return;
        }

        // Get results
        this.db.all(searchQuery, [...params, limit], (err, logs: LogEntry[]) => {
          if (err) {
            reject(new StorageError('Failed to search logs', err));
            return;
          }

          resolve({
            logs,
            totalMatches: countRow.count,
          });
        });
      });
    });
  }

  /**
   * Get project summary statistics
   */
  async getProjectSummary(
    projectName: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectSummary> {
    const conditions: string[] = ['project_name = ?'];
    const params: unknown[] = [projectName];

    if (startDate) {
      conditions.push('timestamp >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('timestamp <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const summaryQuery = `
      SELECT 
        COUNT(*) as totalLogs,
        COUNT(DISTINCT session_id) as sessionCount,
        MIN(timestamp) as startDate,
        MAX(timestamp) as endDate
      FROM work_logs 
      ${whereClause}
    `;

    const recentQuery = `
      SELECT * FROM work_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT 5
    `;

    return new Promise((resolve, reject) => {
      // Get summary stats
      this.db.get(
        summaryQuery,
        params,
        (
          err,
          summary: {
            totalLogs: number;
            sessionCount: number;
            startDate: string;
            endDate: string;
          }
        ) => {
          if (err) {
            reject(new StorageError('Failed to get project summary', err));
            return;
          }

          // Get recent activity
          this.db.all(recentQuery, params, (err, recentActivity: LogEntry[]) => {
            if (err) {
              reject(new StorageError('Failed to get recent activity', err));
              return;
            }

            resolve({
              projectName,
              totalLogs: summary.totalLogs,
              sessionCount: summary.sessionCount,
              dateRange: {
                start: summary.startDate || '',
                end: summary.endDate || '',
              },
              recentActivity,
            });
          });
        }
      );
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(new StorageError('Failed to close database', err));
          return;
        }
        resolve();
      });
    });
  }
}
