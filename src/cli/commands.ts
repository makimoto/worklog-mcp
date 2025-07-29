import type { StorageManager } from '../storage/manager.js';
import type { LogFilters } from '../models/types.js';
import { FormatterFactory } from '../display/formatters';

/**
 * CLI command options interfaces
 */
export interface ListOptions {
  project?: string;
  session?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  format?: string;
}

export interface SearchOptions {
  fields?: string[];
  limit?: number;
  format?: string;
}

export interface ShowOptions {
  format?: string;
}

export interface SessionOptions {
  project?: string;
  limit?: number;
  format?: string;
}

/**
 * Format a log entry for display
 */
function formatLogEntry(log: any, index: number): string {
  const timestamp = new Date(log.timestamp).toLocaleString();

  // Handle both snake_case (from DB) and camelCase (from interfaces)
  const workContent = log.work_content || log.workContent || '';
  const projectName = log.project_name || log.projectName || '';
  const sessionId = log.session_id || log.sessionId || '';

  const content = workContent.length > 100 ? workContent.substring(0, 100) + '...' : workContent;

  let output = `${index + 1}. [${timestamp}] ${projectName}\n`;
  output += `   work_content: ${content}\n`;

  if (log.successes) {
    output += `   successes: ${log.successes}\n`;
  }

  if (log.failures) {
    output += `   failures: ${log.failures}\n`;
  }

  if (log.blockers) {
    output += `   blockers: ${log.blockers}\n`;
  }

  if (log.thoughts) {
    output += `   thoughts: ${log.thoughts}\n`;
  }

  output += `   session_id: ${sessionId}\n`;

  return output;
}

/**
 * List work logs with optional filtering
 */
export async function listCommand(
  storageManager: StorageManager,
  options: ListOptions
): Promise<void> {
  try {
    const filters: LogFilters = {
      limit: options.limit || 20,
      offset: options.offset || 0,
    };

    if (options.project) {
      filters.projectName = options.project;
    }

    if (options.session) {
      filters.sessionId = options.session;
    }

    if (options.startDate) {
      filters.startDate = options.startDate;
    }

    if (options.endDate) {
      filters.endDate = options.endDate;
    }

    const response = await storageManager.getLogs(filters);

    if (options.format && options.format !== 'default') {
      try {
        const formatter = FormatterFactory.create(options.format);
        console.log(formatter.format(response.logs));
      } catch (error) {
        console.error(`Invalid format: ${options.format}`);
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.error(`Supported formats: ${FormatterFactory.getSupportedFormats().join(', ')}`);
        return;
      }
    } else {
      console.log(`Work Logs (${response.totalCount} total)`);
      console.log('');

      if (response.logs.length === 0) {
        console.log('No logs found.');
        return;
      }

      response.logs.forEach((log, index) => {
        console.log(formatLogEntry(log, index));
      });

      if (response.hasMore) {
        console.log(`... and ${response.totalCount - response.logs.length} more logs`);
        console.log(`Use --offset ${filters.offset! + filters.limit!} to see more`);
      }
    }
  } catch (error) {
    console.error('Error listing logs:', error instanceof Error ? error.message : error);
  }
}

/**
 * Show logs for a specific session
 */
export async function showCommand(
  storageManager: StorageManager,
  sessionId: string,
  options: ShowOptions = {}
): Promise<void> {
  try {
    if (!sessionId || sessionId.trim() === '') {
      console.error('Session ID is required');
      return;
    }

    const response = await storageManager.getSessionLogs(sessionId);

    if (options.format && options.format !== 'default') {
      try {
        const formatter = FormatterFactory.create(options.format);
        console.log(formatter.format(response.logs));
      } catch (error) {
        console.error(`Invalid format: ${options.format}`);
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.error(`Supported formats: ${FormatterFactory.getSupportedFormats().join(', ')}`);
        return;
      }
    } else {
      console.log(`Session: ${sessionId}`);
      console.log(`Total logs: ${response.sessionSummary.totalLogs}`);
      console.log(
        `Date range: ${new Date(response.sessionSummary.dateRange.start).toLocaleString()} - ${new Date(response.sessionSummary.dateRange.end).toLocaleString()}`
      );
      console.log('');

      if (response.logs.length === 0) {
        console.log('No logs found for this session.');
        return;
      }

      response.logs.forEach((log, index) => {
        console.log(formatLogEntry(log, index));
      });
    }
  } catch (error) {
    console.error('Error showing session:', error instanceof Error ? error.message : error);
  }
}

/**
 * Search logs by content
 */
export async function searchCommand(
  storageManager: StorageManager,
  query: string,
  options: SearchOptions
): Promise<void> {
  try {
    if (!query || query.trim() === '') {
      console.error('Search query is required');
      return;
    }

    const response = await storageManager.searchLogs(query, options.fields, options.limit || 20);

    if (options.format && options.format !== 'default') {
      try {
        const formatter = FormatterFactory.create(options.format);
        console.log(formatter.format(response.logs));
      } catch (error) {
        console.error(`Invalid format: ${options.format}`);
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.error(`Supported formats: ${FormatterFactory.getSupportedFormats().join(', ')}`);
        return;
      }
    } else {
      console.log(`Search Results for "${query}" (${response.totalMatches} matches)`);
      console.log('');

      if (response.logs.length === 0) {
        console.log('No matching logs found.');
        return;
      }

      response.logs.forEach((log, index) => {
        console.log(formatLogEntry(log, index));
      });

      if (response.totalMatches > response.logs.length) {
        console.log(`... and ${response.totalMatches - response.logs.length} more matches`);
        console.log('Use --limit to see more results');
      }
    }
  } catch (error) {
    console.error('Error searching logs:', error instanceof Error ? error.message : error);
  }
}

/**
 * List recent sessions
 */
export async function sessionListCommand(
  storageManager: StorageManager,
  options: SessionOptions
): Promise<void> {
  try {
    const sessions = await storageManager.getRecentSessions({
      limit: options.limit || 10,
      projectName: options.project,
    });

    if (options.format && options.format !== 'default') {
      try {
        const formatter = FormatterFactory.create(options.format);
        console.log(formatter.format(sessions as any));
      } catch (error) {
        console.error(`Invalid format: ${options.format}`);
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.error(`Supported formats: ${FormatterFactory.getSupportedFormats().join(', ')}`);
        return;
      }
    } else {
      console.log('Recent Sessions:');
      console.log('');

      if (sessions.length === 0) {
        console.log('No recent sessions found.');
        return;
      }

      sessions.forEach((session, index) => {
        const lastActivity = new Date(session.lastActivity).toLocaleString();
        console.log(`${index + 1}. Session: ${session.sessionId}`);
        console.log(`   project_name: ${session.projectName}`);
        console.log(`   last_activity: ${lastActivity}`);
        console.log(`   log_count: ${session.logCount}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error listing sessions:', error instanceof Error ? error.message : error);
  }
}

/**
 * Show the latest session for a project
 */
export async function sessionLatestCommand(
  storageManager: StorageManager,
  projectName: string,
  options: SessionOptions
): Promise<void> {
  try {
    if (!projectName || projectName.trim() === '') {
      console.error('Project name is required');
      return;
    }

    const session = await storageManager.getLatestSession(projectName.trim());

    if (!session) {
      console.log(`No sessions found for project: ${projectName}`);
      return;
    }

    if (options.format && options.format !== 'default') {
      try {
        const formatter = FormatterFactory.create(options.format);
        console.log(formatter.format([session] as any));
      } catch (error) {
        console.error(`Invalid format: ${options.format}`);
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        console.error(`Supported formats: ${FormatterFactory.getSupportedFormats().join(', ')}`);
        return;
      }
    } else {
      console.log(`Latest session for ${projectName}:`);
      console.log('');

      const lastActivity = new Date(session.lastActivity).toLocaleString();
      console.log(`Session: ${session.sessionId}`);
      console.log(`project_name: ${session.projectName}`);
      console.log(`last_activity: ${lastActivity}`);
      console.log(`log_count: ${session.logCount}`);
    }
  } catch (error) {
    console.error('Error getting latest session:', error instanceof Error ? error.message : error);
  }
}
