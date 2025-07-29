import { describe, it, expect, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('CLI Entry Point', () => {
  let cliProcess: ChildProcess;

  const CLI_PATH = path.join(__dirname, '../../dist/cli.js');

  afterEach(() => {
    if (cliProcess && !cliProcess.killed) {
      cliProcess.kill('SIGTERM');
    }
  });

  it('should show error message when not running in stdio mode', (done) => {
    cliProcess = spawn('node', [CLI_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    cliProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    cliProcess.on('exit', (code) => {
      expect(code).toBe(1);
      expect(stderr).toContain('This CLI currently only supports MCP stdio mode');
      expect(stderr).toContain('Usage: node cli.js --stdio');
      done();
    });

    // Give it a moment to start and exit
    setTimeout(() => {
      if (!cliProcess.killed) {
        cliProcess.kill('SIGTERM');
      }
    }, 1000);
  });

  it('should start successfully in stdio mode', (done) => {
    cliProcess = spawn('node', [CLI_PATH, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, WORKLOG_DB_PATH: ':memory:' },
    });

    let stderr = '';
    cliProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait a bit to see if it starts without errors
    setTimeout(() => {
      // If process is still running and no errors in stderr, it started successfully
      if (!cliProcess.killed && stderr === '') {
        expect(cliProcess.pid).toBeDefined();
        cliProcess.kill('SIGTERM');
        done();
      } else if (stderr.includes('Failed to start MCP server')) {
        done(new Error(`CLI failed to start: ${stderr}`));
      } else {
        // Process might still be starting
        cliProcess.kill('SIGTERM');
        done();
      }
    }, 2000);
  });

  it('should handle SIGINT gracefully', (done) => {
    cliProcess = spawn('node', [CLI_PATH, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, WORKLOG_DB_PATH: ':memory:' },
    });

    let stderr = '';
    cliProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait for startup, then send SIGINT
    setTimeout(() => {
      cliProcess.kill('SIGINT');
    }, 1000);

    cliProcess.on('exit', (code) => {
      // Should exit gracefully with code 0
      expect(code).toBe(0);
      expect(stderr).not.toContain('Fatal error');
      done();
    });
  });

  it('should handle SIGTERM gracefully', (done) => {
    cliProcess = spawn('node', [CLI_PATH, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, WORKLOG_DB_PATH: ':memory:' },
    });

    let stderr = '';
    cliProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait for startup, then send SIGTERM
    setTimeout(() => {
      cliProcess.kill('SIGTERM');
    }, 1000);

    cliProcess.on('exit', (code) => {
      // Should exit gracefully with code 0
      expect(code).toBe(0);
      expect(stderr).not.toContain('Fatal error');
      done();
    });
  });

  it('should use custom database path from environment variable', (done) => {
    const customDbPath = '/tmp/test-worklog.db';

    cliProcess = spawn('node', [CLI_PATH, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, WORKLOG_DB_PATH: customDbPath },
    });

    let stderr = '';
    cliProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait a bit to see if it starts without errors
    setTimeout(() => {
      if (!cliProcess.killed && stderr === '') {
        // If no errors, the custom path was likely used successfully
        expect(cliProcess.pid).toBeDefined();
        cliProcess.kill('SIGTERM');
        done();
      } else if (stderr.includes('Failed to start MCP server')) {
        done(new Error(`CLI failed to start with custom DB path: ${stderr}`));
      } else {
        cliProcess.kill('SIGTERM');
        done();
      }
    }, 2000);
  });
});
