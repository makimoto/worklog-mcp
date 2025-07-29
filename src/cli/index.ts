#!/usr/bin/env node

import { Command } from 'commander';
import { StorageManager } from '../storage/manager.js';
import { ConfigManager } from '../config/manager.js';
import {
  listCommand,
  showCommand,
  searchCommand,
  sessionListCommand,
  sessionLatestCommand,
} from './commands.js';
import { configCommand, summaryCommand } from './configCommands.js';
import type { ListOptions, SearchOptions, SessionOptions } from './commands.js';
import path from 'path';
import os from 'os';

async function main() {
  const program = new Command();

  program.name('worklog').description('AI Agent Work Log CLI').version('0.1.0');

  // Initialize managers
  const defaultDbPath = path.join(os.homedir(), '.worklog', 'work_logs.db');
  const dbPath = process.env['WORKLOG_DB_PATH'] || defaultDbPath;
  const storageManager = new StorageManager(dbPath);
  const configManager = new ConfigManager();

  // Initialize storage
  await storageManager.initialize();

  // List command
  program
    .command('list')
    .description('List work logs with optional filtering')
    .option('-p, --project <project>', 'Filter by project name')
    .option('-s, --session <session>', 'Filter by session ID')
    .option('-l, --limit <limit>', 'Maximum number of logs to show', '20')
    .option('-o, --offset <offset>', 'Number of logs to skip', '0')
    .option('--start-date <date>', 'Filter logs from this date (ISO 8601)')
    .option('--end-date <date>', 'Filter logs until this date (ISO 8601)')
    .option('-f, --format <format>', 'Output format (table, json, markdown)', 'default')
    .action(async (options) => {
      const listOptions: ListOptions = {
        project: options.project,
        session: options.session,
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10),
        startDate: options.startDate,
        endDate: options.endDate,
        format: options.format,
      };

      await listCommand(storageManager, listOptions);
    });

  // Show command
  program
    .command('show <sessionId>')
    .description('Show all logs for a specific session')
    .option('-f, --format <format>', 'Output format (table, json, markdown)', 'default')
    .action(async (sessionId: string, options) => {
      await showCommand(storageManager, sessionId, { format: options.format });
    });

  // Search command
  program
    .command('search <query>')
    .description('Search logs by content')
    .option(
      '--fields <fields...>',
      'Fields to search in (work_content, successes, failures, blockers, thoughts)'
    )
    .option('-l, --limit <limit>', 'Maximum number of results to show', '20')
    .option('-f, --format <format>', 'Output format (table, json, markdown)', 'default')
    .action(async (query: string, options) => {
      const searchOptions: SearchOptions = {
        fields: options.fields,
        limit: parseInt(options.limit, 10),
        format: options.format,
      };

      await searchCommand(storageManager, query, searchOptions);
    });

  // Config command
  program
    .command('config <subcommand> [args...]')
    .description('Manage configuration (show, get, set, reset)')
    .option('-f, --format <format>', 'Output format (table, json)', 'json')
    .action(async (subcommand: string, args: string[], options) => {
      await configCommand(configManager, subcommand, args, { format: options.format });
    });

  // Summary command
  program
    .command('summary')
    .description('Display work log summary and statistics')
    .option('-p, --project <project>', 'Filter by project name')
    .option('--period <period>', 'Time period (week, month, year)', 'week')
    .option('-f, --format <format>', 'Output format (text, table, json)', 'text')
    .action(async (options) => {
      await summaryCommand(storageManager, {
        project: options.project,
        period: options.period,
        format: options.format,
      });
    });

  // Session commands
  const sessionCmd = program.command('session').description('Manage and view work sessions');

  sessionCmd
    .command('list')
    .description('List recent sessions')
    .option('-p, --project <project>', 'Filter by project name')
    .option('-l, --limit <limit>', 'Maximum number of sessions to show', '10')
    .option('-f, --format <format>', 'Output format (table, json, markdown)', 'default')
    .action(async (options) => {
      const sessionOptions: SessionOptions = {
        project: options.project,
        limit: parseInt(options.limit, 10),
        format: options.format,
      };

      await sessionListCommand(storageManager, sessionOptions);
    });

  sessionCmd
    .command('latest <project>')
    .description('Show the latest session for a project')
    .option('-f, --format <format>', 'Output format (table, json, markdown)', 'default')
    .action(async (project: string, options) => {
      const sessionOptions: SessionOptions = {
        format: options.format,
      };

      await sessionLatestCommand(storageManager, project, sessionOptions);
    });

  // Parse arguments
  await program.parseAsync(process.argv);

  // Close storage connection
  await storageManager.close();
}

// Handle errors
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
