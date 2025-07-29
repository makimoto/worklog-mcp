import type { StorageManager } from '../storage/manager';
import type { ConfigManager } from '../config/manager';

export interface ConfigCommandOptions {
  format?: string;
}

export interface SummaryCommandOptions {
  project?: string;
  period?: string;
  format?: string;
}

export async function configCommand(
  configManager: ConfigManager,
  subcommand: string,
  args: string[],
  options: ConfigCommandOptions = {}
): Promise<void> {
  try {
    await configManager.loadConfig();

    switch (subcommand) {
      case 'show':
        await showConfig(configManager, options);
        break;
      case 'get':
        await getConfig(configManager, args);
        break;
      case 'set':
        await setConfig(configManager, args);
        break;
      case 'reset':
        await resetConfig(configManager);
        break;
      default:
        console.error(`Invalid config subcommand: ${subcommand}`);
        console.error('Available subcommands: show, get, set, reset');
        return;
    }
  } catch (error) {
    console.error('Configuration error:', error instanceof Error ? error.message : error);
  }
}

async function showConfig(
  configManager: ConfigManager,
  options: ConfigCommandOptions
): Promise<void> {
  const config = await configManager.loadConfig();

  if (options.format === 'table') {
    console.log('Current Configuration:');
    console.log('┌──────────────────────────┬─────────────────────────────────────┐');
    console.log('│ Setting                  │ Value                               │');
    console.log('├──────────────────────────┼─────────────────────────────────────┤');

    const flatConfig = flattenConfig(config);
    Object.entries(flatConfig).forEach(([key, value]) => {
      const truncatedKey = key.length > 24 ? key.substring(0, 21) + '...' : key.padEnd(24);
      const truncatedValue =
        String(value).length > 35
          ? String(value).substring(0, 32) + '...'
          : String(value).padEnd(35);
      console.log(`│ ${truncatedKey} │ ${truncatedValue} │`);
    });

    console.log('└──────────────────────────┴─────────────────────────────────────┘');
  } else {
    console.log('Current Configuration:');
    console.log(JSON.stringify(config, null, 2));
  }
}

async function getConfig(configManager: ConfigManager, args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error('Configuration key is required');
    return;
  }

  const key = args[0]!;
  const value = configManager.getConfigValue(key);

  if (value === undefined) {
    console.error(`Configuration key not found: ${key}`);
    return;
  }

  console.log(value);
}

async function setConfig(configManager: ConfigManager, args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error('Both configuration key and value are required');
    return;
  }

  const key = args[0]!;
  let value: any = args[1];

  // Type conversion
  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (!isNaN(Number(value))) value = Number(value);

  await configManager.setConfigValue(key, value);
  console.log(`Configuration updated: ${key} = ${value}`);
}

async function resetConfig(configManager: ConfigManager): Promise<void> {
  await configManager.resetConfig();
  console.log('Configuration reset to defaults');
}

function flattenConfig(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(result, flattenConfig(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }

  return result;
}

export async function summaryCommand(
  storageManager: StorageManager,
  options: SummaryCommandOptions = {}
): Promise<void> {
  try {
    const filters: any = {
      limit: 1000, // Get many logs for analysis
    };

    // Apply filters
    if (options.project) {
      filters.projectName = options.project;
    }

    if (options.period) {
      const dateRange = calculateDateRange(options.period);
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }

    const response = await storageManager.getLogs(filters);

    if (response.logs.length === 0) {
      console.log('No logs found for summary');
      return;
    }

    if (options.format === 'json') {
      const summary = generateLogSummary(response.logs);
      console.log(JSON.stringify(summary, null, 2));
    } else if (options.format === 'table') {
      displaySummaryTable(response.logs);
    } else {
      displaySummaryText(response.logs);
    }
  } catch (error) {
    console.error('Error generating summary:', error instanceof Error ? error.message : error);
  }
}

function calculateDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 7); // Default to week
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

function generateLogSummary(logs: any[]): any {
  const projects = new Map<string, number>();
  const sessions = new Set<string>();
  let successCount = 0;
  let failureCount = 0;
  let blockerCount = 0;

  logs.forEach((log) => {
    // Handle both snake_case and camelCase
    const projectName = (log as any).project_name || log.projectName || 'unknown';
    const sessionId = (log as any).session_id || log.sessionId;

    projects.set(projectName, (projects.get(projectName) || 0) + 1);
    sessions.add(sessionId);

    if (log.successes) successCount++;
    if (log.failures) failureCount++;
    if (log.blockers) blockerCount++;
  });

  return {
    overview: {
      totalLogs: logs.length,
      totalProjects: projects.size,
      totalSessions: sessions.size,
    },
    projects: Object.fromEntries(projects),
    analysis: {
      successRate: Math.round((successCount / logs.length) * 100),
      failureRate: Math.round((failureCount / logs.length) * 100),
      blockerRate: Math.round((blockerCount / logs.length) * 100),
    },
  };
}

function displaySummaryText(logs: any[]): void {
  const summary = generateLogSummary(logs);

  console.log('Work Log Summary');
  console.log('================');
  console.log(`Total Logs: ${summary.overview.totalLogs}`);
  console.log(`Projects: ${summary.overview.totalProjects}`);
  console.log(`Sessions: ${summary.overview.totalSessions}`);
  console.log('');

  console.log('Project Breakdown:');
  Object.entries(summary.projects).forEach(([project, count]) => {
    console.log(`  ${project}: ${count} logs`);
  });
  console.log('');

  console.log('Activity Analysis:');
  console.log(
    `  Logs with successes: ${Math.round((summary.analysis.successRate / 100) * logs.length)} (${summary.analysis.successRate}%)`
  );
  console.log(
    `  Logs with failures: ${Math.round((summary.analysis.failureRate / 100) * logs.length)} (${summary.analysis.failureRate}%)`
  );
  console.log(
    `  Logs with blockers: ${Math.round((summary.analysis.blockerRate / 100) * logs.length)} (${summary.analysis.blockerRate}%)`
  );
}

function displaySummaryTable(logs: any[]): void {
  const summary = generateLogSummary(logs);

  console.log('Work Log Summary');
  console.log('┌─────────────────┬──────────────────┐');
  console.log('│ Metric          │ Value            │');
  console.log('├─────────────────┼──────────────────┤');
  console.log(`│ Total Logs      │ ${summary.overview.totalLogs.toString().padEnd(16)} │`);
  console.log(`│ Projects        │ ${summary.overview.totalProjects.toString().padEnd(16)} │`);
  console.log(`│ Sessions        │ ${summary.overview.totalSessions.toString().padEnd(16)} │`);
  console.log('├─────────────────┼──────────────────┤');

  Object.entries(summary.projects).forEach(([project, count]) => {
    const truncatedProject =
      project.length > 15 ? project.substring(0, 12) + '...' : project.padEnd(15);
    console.log(`│ ${truncatedProject} │ ${String(count).padEnd(16)} │`);
  });

  console.log('└─────────────────┴──────────────────┘');
}
