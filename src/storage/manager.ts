import { randomUUID } from 'crypto';
import type {
  LogEntry,
  LogFilters,
  CreateLogInput,
  CreateLogResponse,
  GetLogsResponse,
  GetSessionLogsResponse,
  SearchLogsResponse,
  ProjectSummary,
  SessionSummary,
  GetRecentSessionsOptions,
} from '../models/types';
import { DefaultSessionManager } from '../models/session';
import {
  validateCreateLogInput,
  validateLogFilters,
  validateSearchQuery,
} from '../models/validation';
import type { StorageInterface } from './interface';
import { SQLiteStorage } from './sqlite';

/**
 * High-level storage manager that combines storage operations with business logic
 */
export class StorageManager {
  private storage: StorageInterface;
  private sessionManager: DefaultSessionManager;

  constructor(databasePath: string) {
    this.storage = new SQLiteStorage(databasePath);
    this.sessionManager = new DefaultSessionManager();
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    await this.storage.initializeStorage();
  }

  /**
   * Create a new log entry with validation and auto-generated fields
   */
  async createLog(input: CreateLogInput): Promise<CreateLogResponse> {
    // Validate input
    validateCreateLogInput(input);

    // Generate or validate session ID
    const sessionId = this.sessionManager.getOrCreateSession(input.sessionId);

    // Create log entry with auto-generated fields
    const logEntry: LogEntry = {
      logId: randomUUID(),
      timestamp: new Date().toISOString(),
      sessionId,
      projectName: input.projectName.trim(),
      workContent: input.workContent.trim(),
      successes: input.successes?.trim() || undefined,
      failures: input.failures?.trim() || undefined,
      blockers: input.blockers?.trim() || undefined,
      thoughts: input.thoughts?.trim() || undefined,
    };

    return await this.storage.createLog(logEntry);
  }

  /**
   * Get logs with validation and default values
   */
  async getLogs(filters: LogFilters = {}): Promise<GetLogsResponse> {
    validateLogFilters(filters);

    // Apply defaults
    const normalizedFilters: LogFilters = {
      limit: Math.min(filters.limit || 50, 1000), // Cap at 1000
      offset: filters.offset || 0,
      projectName: filters.projectName?.trim(),
      sessionId: filters.sessionId?.trim(),
      startDate: filters.startDate,
      endDate: filters.endDate,
    };

    return await this.storage.getLogs(normalizedFilters);
  }

  /**
   * Get all logs for a specific session
   */
  async getSessionLogs(sessionId: string): Promise<GetSessionLogsResponse> {
    if (!this.sessionManager.validateSessionId(sessionId)) {
      throw new Error(`Invalid session ID format: ${sessionId}`);
    }

    return await this.storage.getSessionLogs(sessionId);
  }

  /**
   * Search logs by content with validation
   */
  async searchLogs(query: string, fields?: string[], limit?: number): Promise<SearchLogsResponse> {
    validateSearchQuery(query);

    const normalizedLimit = Math.min(limit || 50, 1000); // Cap at 1000
    const normalizedQuery = query.trim();

    // Default search fields
    const searchFields = fields || [
      'work_content',
      'successes',
      'failures',
      'blockers',
      'thoughts',
    ];

    return await this.storage.searchLogs(normalizedQuery, searchFields, normalizedLimit);
  }

  /**
   * Get project summary with validation
   */
  async getProjectSummary(
    projectName: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProjectSummary> {
    if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
      throw new Error('Project name is required and must be a non-empty string');
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        throw new Error('Start date must be before or equal to end date');
      }
    }

    return await this.storage.getProjectSummary(projectName.trim(), startDate, endDate);
  }

  /**
   * Get all projects with basic statistics
   */
  async getAllProjects(): Promise<
    Array<{ projectName: string; totalLogs: number; lastActivity: string }>
  > {
    const response = await this.storage.getLogs({ limit: 1000 }); // Get recent logs
    const projectMap = new Map<string, { count: number; lastActivity: string }>();

    for (const log of response.logs) {
      const existing = projectMap.get(log.projectName);
      if (!existing || log.timestamp > existing.lastActivity) {
        projectMap.set(log.projectName, {
          count: (existing?.count || 0) + 1,
          lastActivity: log.timestamp,
        });
      }
    }

    return Array.from(projectMap.entries())
      .map(([projectName, stats]) => ({
        projectName,
        totalLogs: stats.count,
        lastActivity: stats.lastActivity,
      }))
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }

  /**
   * Get recent activity across all projects
   */
  async getRecentActivity(limit = 20): Promise<LogEntry[]> {
    const response = await this.storage.getLogs({ limit });
    return response.logs;
  }

  /**
   * Get recent sessions with optional project filtering
   */
  async getRecentSessions(options: GetRecentSessionsOptions): Promise<SessionSummary[]> {
    const { limit = 10, projectName } = options;

    // Get logs grouped by session
    const response = await this.storage.getLogs({
      limit: 1000, // Get enough data to find sessions
      projectName,
    });

    // Group logs by session
    const sessionMap = new Map<
      string,
      {
        projectName: string;
        lastActivity: string;
        logCount: number;
      }
    >();

    for (const log of response.logs) {
      // Handle both snake_case (from DB) and camelCase (from interfaces)
      const sessionKey = (log as any).session_id || log.sessionId;
      const projectName = (log as any).project_name || log.projectName;
      const timestamp = log.timestamp;

      const existing = sessionMap.get(sessionKey);

      if (!existing || timestamp > existing.lastActivity) {
        sessionMap.set(sessionKey, {
          projectName: projectName,
          lastActivity: timestamp,
          logCount: (existing?.logCount || 0) + 1,
        });
      } else {
        sessionMap.set(sessionKey, {
          ...existing,
          logCount: existing.logCount + 1,
        });
      }
    }

    // Convert to SessionSummary array and sort by last activity
    return Array.from(sessionMap.entries())
      .map(([sessionId, data]) => ({
        sessionId,
        projectName: data.projectName,
        lastActivity: data.lastActivity,
        logCount: data.logCount,
      }))
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
      .slice(0, limit);
  }

  /**
   * Get the latest session for a specific project
   */
  async getLatestSession(projectName: string): Promise<SessionSummary | null> {
    if (!projectName?.trim()) {
      throw new Error('Project name is required');
    }

    const sessions = await this.getRecentSessions({
      limit: 1,
      projectName: projectName.trim(),
    });

    return sessions.length > 0 ? sessions[0]! : null;
  }

  /**
   * Close the storage connection
   */
  async close(): Promise<void> {
    await this.storage.close();
  }
}
