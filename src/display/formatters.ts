import type { LogEntry } from '../models/types.js';

/**
 * Base interface for all formatters
 */
export interface Formatter {
  format(logs: LogEntry[]): string;
}

/**
 * Summary statistics for a set of logs
 */
interface LogSummary {
  totalLogs: number;
  dateRange: {
    start: string;
    end: string;
  };
  projects: string[];
  sessions: string[];
}

/**
 * Generate summary statistics from logs
 */
function generateSummary(logs: LogEntry[]): LogSummary {
  if (logs.length === 0) {
    return {
      totalLogs: 0,
      dateRange: { start: '', end: '' },
      projects: [],
      sessions: [],
    };
  }

  const timestamps = logs.map((log) => log.timestamp).sort();
  const projects = [
    ...new Set(logs.map((log) => (log as any).project_name || log.projectName || '')),
  ];
  const sessions = [...new Set(logs.map((log) => (log as any).session_id || log.sessionId || ''))];

  return {
    totalLogs: logs.length,
    dateRange: {
      start: timestamps[0] || '',
      end: timestamps[timestamps.length - 1] || '',
    },
    projects,
    sessions,
  };
}

/**
 * Table formatter for console output
 */
export class TableFormatter implements Formatter {
  format(logs: LogEntry[]): string {
    if (logs.length === 0) {
      return 'No logs to display.\n';
    }

    const summary = generateSummary(logs);
    let result = `\nWork Logs Summary: ${summary.totalLogs} logs\n\n`;

    // Table header
    result +=
      '┌─────┬──────────────────┬─────────────────┬──────────────────┬──────────────────────────────────────────────┐\n';
    result +=
      '│ #   │ Timestamp        │ Project         │ Session          │ Work Content                                 │\n';
    result +=
      '├─────┼──────────────────┼─────────────────┼──────────────────┼──────────────────────────────────────────────┤\n';

    logs.forEach((log, index) => {
      const timestamp = new Date(log.timestamp).toLocaleDateString();

      // Handle both snake_case (from DB) and camelCase (from interfaces)
      const projectName = (log as any).project_name || log.projectName || '';
      const sessionId = (log as any).session_id || log.sessionId || '';
      const workContent = (log as any).work_content || log.workContent || '';

      const project =
        projectName.length > 15 ? projectName.substring(0, 12) + '...' : projectName.padEnd(15);
      const session =
        sessionId.length > 16 ? sessionId.substring(0, 13) + '...' : sessionId.padEnd(16);
      const content =
        workContent.length > 44 ? workContent.substring(0, 41) + '...' : workContent.padEnd(44);

      result += `│ ${(index + 1).toString().padStart(3)} │ ${timestamp.padEnd(16)} │ ${project} │ ${session} │ ${content} │\n`;
    });

    result +=
      '└─────┴──────────────────┴─────────────────┴──────────────────┴──────────────────────────────────────────────┘\n';

    return result;
  }
}

/**
 * JSON formatter for structured output
 */
export class JsonFormatter implements Formatter {
  format(logs: LogEntry[]): string {
    const summary = generateSummary(logs);

    const output = {
      logs,
      summary,
      generatedAt: new Date().toISOString(),
    };

    return JSON.stringify(output, null, 2);
  }
}

/**
 * Markdown formatter for documentation
 */
export class MarkdownFormatter implements Formatter {
  format(logs: LogEntry[]): string {
    if (logs.length === 0) {
      return '# Work Logs\n\nNo logs to display.\n';
    }

    const summary = generateSummary(logs);
    let result = '# Work Logs\n\n';

    // Summary section
    result += '## Summary\n\n';
    result += `**Total Logs:** ${summary.totalLogs}\n`;
    result += `**Projects:** ${summary.projects.join(', ')}\n`;
    result += `**Sessions:** ${summary.sessions.length}\n`;
    if (summary.dateRange.start) {
      result += `**Date Range:** ${new Date(summary.dateRange.start).toLocaleDateString()} - ${new Date(summary.dateRange.end).toLocaleDateString()}\n`;
    }
    result += '\n---\n\n';

    // Individual logs
    logs.forEach((log, index) => {
      result += `## Log ${index + 1}\n\n`;

      // Handle both snake_case (from DB) and camelCase (from interfaces)
      const projectName = (log as any).project_name || log.projectName || '';
      const sessionId = (log as any).session_id || log.sessionId || '';
      const workContent = (log as any).work_content || log.workContent || '';

      result += `**Project:** ${projectName}\n`;
      result += `**Session:** ${sessionId}\n`;
      result += `**Timestamp:** ${new Date(log.timestamp).toLocaleString()}\n\n`;

      result += `**Work Content:**\n${workContent}\n\n`;

      if (log.successes) {
        result += `**Successes:**\n${log.successes}\n\n`;
      }

      if (log.failures) {
        result += `**Failures:**\n${log.failures}\n\n`;
      }

      if (log.blockers) {
        result += `**Blockers:**\n${log.blockers}\n\n`;
      }

      if (log.thoughts) {
        result += `**Thoughts:**\n${log.thoughts}\n\n`;
      }

      result += '---\n\n';
    });

    return result;
  }
}

/**
 * Format factory to create appropriate formatter
 */
export class FormatterFactory {
  static create(format: string): Formatter {
    switch (format.toLowerCase()) {
      case 'table':
        return new TableFormatter();
      case 'json':
        return new JsonFormatter();
      case 'markdown':
      case 'md':
        return new MarkdownFormatter();
      default:
        throw new Error(`Unsupported format: ${format}. Supported formats: table, json, markdown`);
    }
  }

  static getSupportedFormats(): string[] {
    return ['table', 'json', 'markdown'];
  }
}
