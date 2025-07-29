/**
 * Core data model for work log entries
 */
export interface LogEntry {
  logId: string;
  timestamp: string; // ISO 8601 format
  sessionId: string;
  projectName: string;
  workContent: string;
  successes?: string;
  failures?: string;
  blockers?: string;
  thoughts?: string;
}

/**
 * Filters for querying log entries
 */
export interface LogFilters {
  limit?: number;
  offset?: number;
  projectName?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Summary statistics for a project
 */
export interface ProjectSummary {
  projectName: string;
  totalLogs: number;
  sessionCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  recentActivity: LogEntry[];
}

/**
 * Summary statistics for logs
 */
export interface LogSummary {
  totalLogs: number;
  dateRange: {
    start: string;
    end: string;
  };
  projectBreakdown: Array<{
    projectName: string;
    count: number;
  }>;
  sessionBreakdown: Array<{
    sessionId: string;
    count: number;
  }>;
}

/**
 * Configuration options for the server
 */
export interface ServerConfig {
  databasePath: string; // Default: "~/.worklog/work_logs.db"
  maxLogSize: number; // Default: 10000 characters
}

/**
 * Input data for creating a log entry
 */
export interface CreateLogInput {
  sessionId?: string;
  projectName: string;
  workContent: string;
  successes?: string;
  failures?: string;
  blockers?: string;
  thoughts?: string;
}

/**
 * Response from creating a log entry
 */
export interface CreateLogResponse {
  logId: string;
  sessionId: string;
  timestamp: string;
}

/**
 * Response from getting logs with pagination info
 */
export interface GetLogsResponse {
  logs: LogEntry[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Response from getting session logs
 */
export interface GetSessionLogsResponse {
  logs: LogEntry[];
  sessionSummary: {
    sessionId: string;
    totalLogs: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

/**
 * Response from searching logs
 */
export interface SearchLogsResponse {
  logs: LogEntry[];
  totalMatches: number;
}

/**
 * Export format for log data
 */
export interface ExportData {
  version: string;
  exportDate: string;
  logs: LogEntry[];
}

/**
 * Session summary information
 */
export interface SessionSummary {
  sessionId: string;
  projectName: string;
  lastActivity: string;
  logCount: number;
}

/**
 * Options for getting recent sessions
 */
export interface GetRecentSessionsOptions {
  limit?: number;
  projectName?: string;
}
