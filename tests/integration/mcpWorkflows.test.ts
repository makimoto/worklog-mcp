import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StorageManager } from '../../src/storage/manager';
import { createLogTool } from '../../src/mcp/tools/createLog';
import { getLogsTool, getSessionLogsTool } from '../../src/mcp/tools/getLogs';
import { searchLogsTool } from '../../src/mcp/tools/searchLogs';
import { validateMCPParameters } from '../../src/models/inputValidation';
import fs from 'fs/promises';
import path from 'path';

/**
 * Integration tests for complete MCP workflows
 * These tests verify that all MCP tools work together correctly
 * with real storage, error handling, and validation
 */
describe('MCP Workflows Integration Tests', () => {
  let storageManager: StorageManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create temporary database for each test
    testDbPath = path.join(
      __dirname,
      '../../.claude_working_dir',
      `test-integration-${Date.now()}.db`
    );

    // Ensure directory exists
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });

    storageManager = new StorageManager(testDbPath);
    await storageManager.initialize();
  });

  afterEach(async () => {
    await storageManager.close();

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Complete Create → Get → Search Workflow', () => {
    it('should create logs, retrieve them, and search successfully', async () => {
      const projectName = 'integration-test-project';

      // Step 1: Create first log entry with new session
      const createParams1 = {
        project_name: projectName,
        work_content: 'Initial implementation of user authentication system',
        successes: 'Successfully set up JWT token generation',
        failures: 'Database connection timeout issues',
        blockers: 'Need to configure SSL certificates',
        thoughts: 'Consider implementing OAuth 2.0 for better security',
        new_session: true,
      };

      // Validate parameters
      expect(() => validateMCPParameters('create_log', createParams1)).not.toThrow();

      const createResult1 = await createLogTool(storageManager, createParams1);
      expect(createResult1.content[0]?.type).toBe('text');

      const response1 = JSON.parse(createResult1.content[0]!.text);
      expect(response1.success).toBe(true);
      expect(response1.logId).toBeDefined();
      expect(response1.sessionId).toMatch(/^claude-code-/);
      expect(response1.message).toBe('New session created');

      const actualSessionId = response1.sessionId;

      // Step 2: Create second log entry in same session
      const createParams2 = {
        project_name: projectName,
        work_content: 'Fixed database connection issues and implemented user registration',
        successes: 'Database connection pool configured correctly',
        failures: 'Some validation errors in user input',
        session_id: actualSessionId,
      };

      const createResult2 = await createLogTool(storageManager, createParams2);
      const response2 = JSON.parse(createResult2.content[0]!.text);
      expect(response2.success).toBe(true);
      expect(response2.sessionId).toBe(actualSessionId);
      expect(response2.message).toBe('Session continued');

      // Step 3: Create log entry for different project
      const createParams3 = {
        project_name: 'other-project',
        work_content: 'Working on frontend components',
        new_session: true,
      };

      const createResult3 = await createLogTool(storageManager, createParams3);
      const response3 = JSON.parse(createResult3.content[0]!.text);
      expect(response3.success).toBe(true);
      expect(response3.sessionId).not.toBe(actualSessionId);

      // Step 4: Get all logs for the main project
      const getLogsParams = {
        project_name: projectName,
        limit: 10,
        offset: 0,
      };

      const getLogsResult = await getLogsTool(storageManager, getLogsParams);
      const logsResponse = JSON.parse(getLogsResult.content[0]!.text);

      expect(logsResponse.logs).toHaveLength(2);
      expect(logsResponse.totalCount).toBe(2);
      expect(logsResponse.logs[0].project_name).toBe(projectName);
      expect(logsResponse.logs[1].project_name).toBe(projectName);

      // Step 5: Get session logs
      const sessionLogsResult = await getSessionLogsTool(storageManager, {
        session_id: actualSessionId,
      });

      const sessionResponse = JSON.parse(sessionLogsResult.content[0]!.text);
      expect(sessionResponse.logs).toHaveLength(2);
      expect(sessionResponse.sessionSummary.sessionId).toBe(actualSessionId);
      expect(sessionResponse.logs.every((log: any) => log.session_id === actualSessionId)).toBe(
        true
      );

      // Step 6: Search logs by content
      const searchParams = {
        query: 'database connection',
        limit: 5,
      };

      const searchResult = await searchLogsTool(storageManager, searchParams);
      const searchResponse = JSON.parse(searchResult.content[0]!.text);

      expect(searchResponse.logs.length).toBeGreaterThan(0);
      expect(
        searchResponse.logs.some(
          (log: any) =>
            log.work_content.includes('database connection') ||
            log.successes?.includes('Database connection') ||
            log.failures?.includes('Database connection')
        )
      ).toBe(true);

      // Step 7: Search with field filtering
      const searchFieldsParams = {
        query: 'OAuth',
        fields: ['thoughts'],
        limit: 5,
      };

      const searchFieldsResult = await searchLogsTool(storageManager, searchFieldsParams);
      const searchFieldsResponse = JSON.parse(searchFieldsResult.content[0]!.text);

      expect(searchFieldsResponse.logs.length).toBeGreaterThan(0);
      expect(searchFieldsResponse.logs.some((log: any) => log.thoughts?.includes('OAuth'))).toBe(
        true
      );
    });

    it('should handle workflow with validation errors', async () => {
      // Test workflow that should fail validation
      const invalidParams = {
        project_name: '', // Invalid: empty project name
        work_content: 'Some work',
        new_session: true,
      };

      expect(() => validateMCPParameters('create_log', invalidParams)).toThrow();

      const createResult = await createLogTool(storageManager, invalidParams);
      const response = JSON.parse(createResult.content[0]!.text);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error.type).toBe('ValidationError');
    });

    it('should handle session management workflow', async () => {
      // Test session validation and continuation
      const projectName = 'session-test';

      // Create with new session
      const createParams1 = {
        project_name: projectName,
        work_content: 'First entry',
        new_session: true,
      };

      const result1 = await createLogTool(storageManager, createParams1);
      const response1 = JSON.parse(result1.content[0]!.text);
      const sessionId = response1.sessionId;

      // Continue existing session
      const createParams2 = {
        project_name: projectName,
        work_content: 'Second entry',
        session_id: sessionId,
      };

      const result2 = await createLogTool(storageManager, createParams2);
      const response2 = JSON.parse(result2.content[0]!.text);

      expect(response2.success).toBe(true);
      expect(response2.sessionId).toBe(sessionId);
      expect(response2.message).toBe('Session continued');

      // Try to use both session_id and new_session (should fail)
      const invalidParams = {
        project_name: projectName,
        work_content: 'Invalid entry',
        session_id: sessionId,
        new_session: true,
      };

      const invalidResult = await createLogTool(storageManager, invalidParams);
      const invalidResponse = JSON.parse(invalidResult.content[0]!.text);

      expect(invalidResponse.success).toBe(false);
      expect(invalidResponse.error.type).toBe('ValidationError');
    });

    it('should handle complex filtering and pagination workflow', async () => {
      const projectName = 'pagination-test';

      // Create multiple log entries
      for (let i = 1; i <= 15; i++) {
        const params: any = {
          project_name: projectName,
          work_content: `Log entry number ${i}`,
          successes: i % 2 === 0 ? `Success for entry ${i}` : undefined,
          failures: i % 3 === 0 ? `Failure for entry ${i}` : undefined,
        };

        if (i === 1) {
          params.new_session = true;
        } else {
          // Use different sessions for variety
          params.session_id = `claude-code-${projectName}-2025-07-25-${Math.ceil(i / 3)}`;
        }

        await createLogTool(storageManager, params);
      }

      // Test pagination
      const page1 = await getLogsTool(storageManager, {
        project_name: projectName,
        limit: 5,
        offset: 0,
      });

      const page2 = await getLogsTool(storageManager, {
        project_name: projectName,
        limit: 5,
        offset: 5,
      });

      const response1 = JSON.parse(page1.content[0]!.text);
      const response2 = JSON.parse(page2.content[0]!.text);

      expect(response1.logs).toHaveLength(5);
      expect(response2.logs).toHaveLength(5);
      expect(response1.totalCount).toBe(15);
      expect(response2.totalCount).toBe(15);

      // Verify different logs in each page
      const ids1 = response1.logs.map((log: any) => log.log_id);
      const ids2 = response2.logs.map((log: any) => log.log_id);
      expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
    });

    it('should handle error recovery workflow', async () => {
      // Test workflow with recoverable and non-recoverable errors
      const projectName = 'error-test';

      // Valid creation
      const validParams = {
        project_name: projectName,
        work_content: 'Valid log entry',
        new_session: true,
      };

      const validResult = await createLogTool(storageManager, validParams);
      const validResponse = JSON.parse(validResult.content[0]!.text);
      expect(validResponse.success).toBe(true);

      // Invalid session ID format
      const invalidSessionParams = {
        project_name: projectName,
        work_content: 'Invalid session',
        session_id: 'invalid@session#id',
      };

      const invalidResult = await createLogTool(storageManager, invalidSessionParams);
      const invalidResponse = JSON.parse(invalidResult.content[0]!.text);

      expect(invalidResponse.success).toBe(false);
      expect(invalidResponse.error.type).toBe('ValidationError');

      // Recovery: valid session continuation
      const recoveryParams = {
        project_name: projectName,
        work_content: 'Recovery entry',
        session_id: validResponse.sessionId,
      };

      const recoveryResult = await createLogTool(storageManager, recoveryParams);
      const recoveryResponse = JSON.parse(recoveryResult.content[0]!.text);

      expect(recoveryResponse.success).toBe(true);
      expect(recoveryResponse.sessionId).toBe(validResponse.sessionId);
    });
  });

  describe('Cross-Tool Data Consistency', () => {
    it('should maintain data consistency across all MCP tools', async () => {
      const projectName = 'consistency-test';
      const workContent = 'Testing data consistency across MCP tools';

      // Create log
      const createParams = {
        project_name: projectName,
        work_content: workContent,
        successes: 'Implemented consistent data handling',
        new_session: true,
      };

      const createResult = await createLogTool(storageManager, createParams);
      const createResponse = JSON.parse(createResult.content[0]!.text);
      const { sessionId, logId } = createResponse;

      // Verify via get_logs
      const getLogsResult = await getLogsTool(storageManager, {
        project_name: projectName,
      });
      const getLogsResponse = JSON.parse(getLogsResult.content[0]!.text);

      expect(getLogsResponse.logs).toHaveLength(1);
      expect(getLogsResponse.logs[0].log_id).toBe(logId);
      expect(getLogsResponse.logs[0].work_content).toBe(workContent);

      // Verify via get_session_logs
      const sessionLogsResult = await getSessionLogsTool(storageManager, {
        session_id: sessionId,
      });
      const sessionLogsResponse = JSON.parse(sessionLogsResult.content[0]!.text);

      expect(sessionLogsResponse.logs).toHaveLength(1);
      expect(sessionLogsResponse.logs[0].log_id).toBe(logId);
      expect(sessionLogsResponse.logs[0].session_id).toBe(sessionId);

      // Verify via search_logs
      const searchResult = await searchLogsTool(storageManager, {
        query: 'consistency',
      });
      const searchResponse = JSON.parse(searchResult.content[0]!.text);

      expect(searchResponse.logs.length).toBeGreaterThan(0);
      const foundLog = searchResponse.logs.find((log: any) => log.log_id === logId);
      expect(foundLog).toBeDefined();
      expect(foundLog.work_content).toBe(workContent);
    });

    it('should handle concurrent operations gracefully', async () => {
      const projectName = 'concurrent-test';

      // Create multiple logs concurrently
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        createLogTool(storageManager, {
          project_name: projectName,
          work_content: `Concurrent log ${i + 1}`,
          new_session: true,
        })
      );

      const results = await Promise.all(createPromises);

      // Verify all succeeded
      results.forEach((result) => {
        const response = JSON.parse(result.content[0]!.text);
        expect(response.success).toBe(true);
        expect(response.logId).toBeDefined();
        expect(response.sessionId).toBeDefined();
      });

      // Verify all logs are retrievable
      const getLogsResult = await getLogsTool(storageManager, {
        project_name: projectName,
        limit: 10,
      });
      const getLogsResponse = JSON.parse(getLogsResult.content[0]!.text);

      expect(getLogsResponse.logs).toHaveLength(5);
      expect(getLogsResponse.totalCount).toBe(5);
    });
  });

  describe('Input Validation Integration', () => {
    it('should integrate input validation with all MCP tools', async () => {
      // Test validation integration with create_log
      const invalidCreateParams = {
        project_name: 'valid-project',
        work_content: 'a'.repeat(10001), // Exceeds max length
        new_session: true,
      };

      const createResult = await createLogTool(storageManager, invalidCreateParams);
      const createResponse = JSON.parse(createResult.content[0]!.text);

      expect(createResponse.success).toBe(false);
      expect(createResponse.error.type).toBe('ValidationError');

      // Test validation integration with get_logs
      const invalidGetParams = {
        limit: -1, // Invalid limit
      };

      expect(() => validateMCPParameters('get_logs', invalidGetParams)).toThrow();

      // Test validation integration with search_logs
      const invalidSearchParams = {
        query: '', // Empty query
      };

      expect(() => validateMCPParameters('search_logs', invalidSearchParams)).toThrow();

      // Test validation integration with get_session_logs
      const invalidSessionParams = {
        session_id: 'invalid@session', // Invalid format
      };

      expect(() => validateMCPParameters('get_session_logs', invalidSessionParams)).toThrow();
    });

    it('should sanitize and validate HTML content', async () => {
      const projectName = 'html-test';
      const maliciousContent = '<script>alert("xss")</script>Safe content';

      const params = {
        project_name: projectName,
        work_content: maliciousContent,
        successes: '<div>HTML content</div>',
        new_session: true,
      };

      // Should succeed with sanitized content
      const result = await createLogTool(storageManager, params);
      const response = JSON.parse(result.content[0]!.text);

      expect(response.success).toBe(true);

      // Verify content is sanitized when retrieved
      const getResult = await getLogsTool(storageManager, {
        project_name: projectName,
      });
      const getResponse = JSON.parse(getResult.content[0]!.text);

      const log = getResponse.logs[0];
      expect(log.work_content).not.toContain('<script>');
      expect(log.successes).not.toContain('<div>');
    });
  });
});
