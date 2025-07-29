import type {
  LogEntry,
  LogFilters,
  CreateLogResponse,
  GetLogsResponse,
  GetSessionLogsResponse,
  SearchLogsResponse,
  ProjectSummary,
} from '../models/types';

/**
 * Storage interface for work log operations
 */
export interface StorageInterface {
  /**
   * Initialize the storage system (create tables, run migrations)
   */
  initializeStorage(): Promise<void>;

  /**
   * Create a new log entry
   */
  createLog(logData: LogEntry): Promise<CreateLogResponse>;

  /**
   * Get logs with optional filtering and pagination
   */
  getLogs(filters: LogFilters): Promise<GetLogsResponse>;

  /**
   * Get all logs for a specific session
   */
  getSessionLogs(sessionId: string): Promise<GetSessionLogsResponse>;

  /**
   * Search logs by content
   */
  searchLogs(query: string, fields?: string[], limit?: number): Promise<SearchLogsResponse>;

  /**
   * Get project summary statistics
   */
  getProjectSummary(
    projectName: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectSummary>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}
