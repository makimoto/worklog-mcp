import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/**
 * End-to-end tests for CLI workflows
 * These tests verify that the CLI works correctly from user perspective
 */
describe('CLI E2E Workflows', () => {
  let workingDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    workingDir = path.join(__dirname, '../../.claude_working_dir', `e2e-test-${Date.now()}`);
    testDbPath = path.join(workingDir, 'test.db');

    // Ensure directory exists
    await fs.mkdir(workingDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(workingDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper function to run CLI commands
   */
  function runCLI(
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000; // 30 second timeout

      // Use npm run cli to run our CLI
      const child = spawn('npm', ['run', 'cli', '--', ...args], {
        cwd: path.resolve(__dirname, '../..'),
        env: {
          ...process.env,
          WORKLOG_DB_PATH: testDbPath,
          NODE_ENV: 'test',
        },
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  describe('Basic CLI Operations', () => {
    it('should display help when no arguments provided', async () => {
      const result = await runCLI(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('worklog');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('search');
    });

    it('should display version information', async () => {
      const result = await runCLI(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('0.1.0');
    });

    it('should handle unknown commands gracefully', async () => {
      const result = await runCLI(['unknown-command']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('unknown command');
    });
  });

  describe('List Command', () => {
    it('should list logs (empty database)', async () => {
      const result = await runCLI(['list']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No logs found');
    });

    it('should handle project filtering', async () => {
      const result = await runCLI(['list', '--project', 'test-project']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No logs found');
    });

    it('should handle limit option', async () => {
      const result = await runCLI(['list', '--limit', '5']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No logs found');
    });
  });

  describe('Search Command', () => {
    it('should handle search with query', async () => {
      const result = await runCLI(['search', 'test-query']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No matching logs found');
    });

    it('should require search query', async () => {
      const result = await runCLI(['search']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('required') || result.stderr.includes('argument')).toBe(true);
    });

    it('should handle fields option', async () => {
      const result = await runCLI(['search', 'test', '--fields', 'work_content', 'successes']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No matching logs found');
    });
  });

  describe('Config Command', () => {
    it('should show configuration', async () => {
      const result = await runCLI(['config', 'show']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('databasePath') || result.stdout.includes('database')).toBe(
        true
      );
    });

    it('should handle config get', async () => {
      const result = await runCLI(['config', 'get', 'databasePath']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('Summary Command', () => {
    it('should display summary', async () => {
      const result = await runCLI(['summary']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('Work Log Summary') || result.stdout.includes('No logs')).toBe(
        true
      );
    });

    it('should handle project filter in summary', async () => {
      const result = await runCLI(['summary', '--project', 'test-project']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('Output Formats', () => {
    it('should support JSON format', async () => {
      const result = await runCLI(['list', '--format', 'json']);

      expect(result.exitCode).toBe(0);
      // Should contain valid JSON structure (even if empty)
      expect(result.stdout.includes('{') || result.stdout.includes('No logs')).toBe(true);
    });

    it('should support table format', async () => {
      const result = await runCLI(['list', '--format', 'table']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('No logs') || result.stdout.includes('Project')).toBe(true);
    });

    it('should support markdown format', async () => {
      const result = await runCLI(['list', '--format', 'markdown']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.includes('No logs') || result.stdout.includes('#')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid options gracefully', async () => {
      const result = await runCLI(['list', '--invalid-option']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.includes('unknown option') || result.stderr.includes('error')).toBe(
        true
      );
    });

    it('should handle database path configuration', async () => {
      const result = await runCLI(['list'], {
        timeout: 10000,
      });

      // Should handle database initialization
      expect(result.exitCode).toBe(0);
    });
  });
});
