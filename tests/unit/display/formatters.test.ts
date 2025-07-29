import { describe, it, expect } from '@jest/globals';
import { TableFormatter, JsonFormatter, MarkdownFormatter } from '../../../src/display/formatters';
import type { LogEntry } from '../../../src/models/types';

describe('Display Formatters', () => {
  const mockLogs: LogEntry[] = [
    {
      logId: 'log-1',
      timestamp: '2024-01-01T10:00:00.000Z',
      sessionId: 'session-1',
      projectName: 'test-project',
      workContent: 'Implemented user authentication',
      successes: 'Login system working correctly',
      failures: 'Password reset had issues',
      blockers: 'Database migration pending',
      thoughts: 'Need to add 2FA support',
    },
    {
      logId: 'log-2',
      timestamp: '2024-01-01T11:00:00.000Z',
      sessionId: 'session-1',
      projectName: 'test-project',
      workContent: 'Fixed password reset functionality',
      successes: 'All authentication flows working',
      failures: undefined,
      blockers: undefined,
      thoughts: 'Ready for production deployment',
    },
  ];

  describe('TableFormatter', () => {
    let formatter: TableFormatter;

    beforeEach(() => {
      formatter = new TableFormatter();
    });

    it('should format logs as a table', () => {
      const result = formatter.format(mockLogs);

      expect(result).toContain('│');
      expect(result).toContain('test-project');
      expect(result).toContain('Implemented user authentication');
      expect(result).toContain('session-1');
    });

    it('should handle empty logs array', () => {
      const result = formatter.format([]);

      expect(result).toContain('No logs to display');
    });

    it('should truncate long content', () => {
      const longLogs: LogEntry[] = [
        {
          logId: 'log-long',
          timestamp: '2024-01-01T10:00:00.000Z',
          sessionId: 'session-1',
          projectName: 'test-project',
          workContent:
            'This is a very long work content that should be truncated because it exceeds the maximum display width for table formatting and we want to keep the table readable',
          successes: undefined,
          failures: undefined,
          blockers: undefined,
          thoughts: undefined,
        },
      ];

      const result = formatter.format(longLogs);

      expect(result).toContain('...');
      expect(result.length).toBeLessThan(1000); // Reasonable table size
    });

    it('should include summary information', () => {
      const result = formatter.format(mockLogs);

      expect(result).toContain('2 logs');
    });
  });

  describe('JsonFormatter', () => {
    let formatter: JsonFormatter;

    beforeEach(() => {
      formatter = new JsonFormatter();
    });

    it('should format logs as valid JSON', () => {
      const result = formatter.format(mockLogs);

      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('logs');
      expect(parsed).toHaveProperty('summary');
      expect(parsed.logs).toHaveLength(2);
    });

    it('should include metadata in JSON output', () => {
      const result = formatter.format(mockLogs);
      const parsed = JSON.parse(result);

      expect(parsed.summary).toHaveProperty('totalLogs', 2);
      expect(parsed.summary).toHaveProperty('dateRange');
      expect(parsed.summary).toHaveProperty('projects');
      expect(parsed.summary.projects).toContain('test-project');
    });

    it('should handle empty logs array', () => {
      const result = formatter.format([]);
      const parsed = JSON.parse(result);

      expect(parsed.logs).toHaveLength(0);
      expect(parsed.summary.totalLogs).toBe(0);
    });

    it('should preserve all log fields', () => {
      const result = formatter.format(mockLogs);
      const parsed = JSON.parse(result);

      const firstLog = parsed.logs[0];
      expect(firstLog).toHaveProperty('logId', 'log-1');
      expect(firstLog).toHaveProperty('workContent', 'Implemented user authentication');
      expect(firstLog).toHaveProperty('successes', 'Login system working correctly');
      expect(firstLog).toHaveProperty('failures', 'Password reset had issues');
    });
  });

  describe('MarkdownFormatter', () => {
    let formatter: MarkdownFormatter;

    beforeEach(() => {
      formatter = new MarkdownFormatter();
    });

    it('should format logs as markdown', () => {
      const result = formatter.format(mockLogs);

      expect(result).toContain('# Work Logs');
      expect(result).toContain('## Log 1');
      expect(result).toContain('**Project:**');
      expect(result).toContain('**Work Content:**');
      expect(result).toContain('test-project');
    });

    it('should include markdown headers and sections', () => {
      const result = formatter.format(mockLogs);

      expect(result).toContain('**Successes:**');
      expect(result).toContain('**Failures:**');
      expect(result).toContain('**Blockers:**');
      expect(result).toContain('**Thoughts:**');
    });

    it('should handle empty logs array', () => {
      const result = formatter.format([]);

      expect(result).toContain('# Work Logs');
      expect(result).toContain('No logs to display');
    });

    it('should skip empty fields', () => {
      const result = formatter.format(mockLogs);

      // Second log has no failures/blockers, should not show those sections
      const log2Section = result.split('## Log 2')[1];
      expect(log2Section).not.toContain('**Failures:**');
      expect(log2Section).not.toContain('**Blockers:**');
    });

    it('should include summary section', () => {
      const result = formatter.format(mockLogs);

      expect(result).toContain('## Summary');
      expect(result).toContain('**Total Logs:** 2');
      expect(result).toContain('**Projects:** test-project');
    });

    it('should format timestamps properly', () => {
      const result = formatter.format(mockLogs);

      expect(result).toContain('**Timestamp:**');
      expect(result).toContain('2024');
    });
  });
});
