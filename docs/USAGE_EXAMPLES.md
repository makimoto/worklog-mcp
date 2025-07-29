# Usage Examples - AI Agent Work Log MCP Server

## Table of Contents
- [Quick Start](#quick-start)
- [Basic Workflow Examples](#basic-workflow-examples)
- [Advanced Usage Patterns](#advanced-usage-patterns)
- [Integration Scenarios](#integration-scenarios)
- [Configuration Examples](#configuration-examples)
- [Error Handling Examples](#error-handling-examples)

## Quick Start

### 1. Setup and Installation

```bash
# Install the package
npm install @makimoto/worklog-mcp

# Or clone and build locally
git clone <repository-url>
cd worklog-mcp
npm install
npm run build
```

### 2. MCP Server Setup

**Option 1: Using Claude Desktop (Recommended)**

```bash
# Add MCP server to Claude Desktop
claude mcp add worklog npx @makimoto/worklog-mcp
```

**Option 2: Manual Configuration**

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "worklog": {
      "command": "npx",
      "args": ["@makimoto/worklog-mcp"],
      "env": {
        "WORKLOG_DB_PATH": "/path/to/your/worklog.db"
      }
    }
  }
}
```

### 3. First Work Log Entry

```javascript
// Create your first work log with a new session
const response = await mcp.call('create_log', {
  project_name: 'my-first-project',
  work_content: 'Started learning the MCP Work Log system',
  successes: 'Successfully set up the MCP server',
  thoughts: 'This will be useful for tracking my AI agent development work',
  new_session: true
});

console.log(`Session created: ${response.sessionId}`);
```

### 4. CLI Usage

The package also provides a command-line interface:

```bash
# List work logs
worklog list --project my-first-project --limit 5

# Search for content
worklog search "MCP server" --fields work_content successes

# View session details  
worklog show claude-code-my-first-project-2025-01-01-123456

# Configuration management
worklog config show
worklog config set databasePath ~/my-worklog.db
```

## Basic Workflow Examples

### Daily Development Workflow

```javascript
// Morning: Start a new session for the day
const startOfDay = await mcp.call('create_log', {
  project_name: 'web-app-development',
  work_content: 'Beginning work on user authentication feature',
  successes: 'Reviewed requirements and created task breakdown',
  thoughts: 'Planning to implement JWT-based authentication with refresh tokens',
  new_session: true
});

const sessionId = startOfDay.sessionId;

// Mid-morning: Progress update
await mcp.call('create_log', {
  project_name: 'web-app-development',
  work_content: 'Implemented user registration endpoint',
  successes: 'Created user model, validation middleware, and password hashing',
  failures: 'Had some issues with email validation regex',
  session_id: sessionId
});

// Afternoon: More progress
await mcp.call('create_log', {
  project_name: 'web-app-development',
  work_content: 'Added JWT token generation and login endpoint',
  successes: 'Authentication flow working end-to-end',
  blockers: 'Need to implement token refresh mechanism',
  thoughts: 'Should consider rate limiting for login attempts',
  session_id: sessionId
});

// End of day: Review session
const sessionLogs = await mcp.call('get_session_logs', {
  session_id: sessionId
});

console.log(`Completed ${sessionLogs.logs.length} work items today`);
```

### Bug Investigation Workflow

```javascript
// Start investigating a reported bug
const bugSession = await mcp.call('create_log', {
  project_name: 'bug-investigation',
  work_content: 'Investigating reported login failures for certain users',
  failures: 'Unable to reproduce the issue in development environment',
  blockers: 'Need access to production logs to understand the issue',
  thoughts: 'Might be related to special characters in passwords',
  new_session: true
});

// Update as investigation progresses
await mcp.call('create_log', {
  project_name: 'bug-investigation',
  work_content: 'Found root cause: Unicode normalization issue in password comparison',
  successes: 'Identified the exact conditions that trigger the bug',
  thoughts: 'Need to implement proper Unicode handling in authentication',
  session_id: bugSession.sessionId
});

// Document the fix
await mcp.call('create_log', {
  project_name: 'bug-investigation',
  work_content: 'Implemented fix for Unicode password issue',
  successes: 'Added proper Unicode normalization before password comparison',
  thoughts: 'Should add regression tests to prevent similar issues',
  session_id: bugSession.sessionId
});
```

### Learning and Research Workflow

```javascript
// Document learning session
const learningSession = await mcp.call('create_log', {
  project_name: 'machine-learning-study',
  work_content: 'Studying transformer architecture and attention mechanisms',
  successes: 'Understood the mathematical foundation of self-attention',
  failures: 'Still confused about multi-head attention computation details',
  thoughts: 'Need to implement a simple transformer from scratch to solidify understanding',
  new_session: true
});

// Follow-up implementation
await mcp.call('create_log', {
  project_name: 'machine-learning-study',
  work_content: 'Implemented basic self-attention mechanism in PyTorch',
  successes: 'Working implementation that passes basic tests',
  blockers: 'Performance is much slower than expected',
  thoughts: 'Should profile the code to identify bottlenecks',
  session_id: learningSession.sessionId
});
```

## Advanced Usage Patterns

### Project Timeline Analysis

```javascript
// Get comprehensive project history
const projectLogs = await mcp.call('get_logs', {
  project_name: 'web-app-development',
  limit: 100,
  offset: 0
});

// Analyze progress patterns
const sessionsMap = new Map();
projectLogs.logs.forEach(log => {
  if (!sessionsMap.has(log.session_id)) {
    sessionsMap.set(log.session_id, []);
  }
  sessionsMap.get(log.session_id).push(log);
});

console.log(`Project has ${sessionsMap.size} work sessions`);
console.log(`Total work entries: ${projectLogs.totalCount}`);

// Find most productive sessions
const sessionProductivity = Array.from(sessionsMap.entries())
  .map(([sessionId, logs]) => ({
    sessionId,
    logCount: logs.length,
    hasSuccesses: logs.some(log => log.successes),
    hasBlockers: logs.some(log => log.blockers)
  }))
  .sort((a, b) => b.logCount - a.logCount);

console.log('Most productive sessions:', sessionProductivity.slice(0, 5));
```

### Cross-Project Knowledge Search

```javascript
// Search for specific technical concepts across all projects
const authResults = await mcp.call('search_logs', {
  query: 'authentication jwt token',
  fields: ['work_content', 'successes', 'thoughts'],
  limit: 20
});

// Search for common failure patterns
const errorResults = await mcp.call('search_logs', {
  query: 'database connection timeout',
  fields: ['failures', 'blockers'],
  limit: 15
});

// Create knowledge base from search results
const knowledgeBase = {
  authentication: authResults.logs.map(log => ({
    project: log.project_name,
    insight: log.thoughts || log.successes,
    timestamp: log.timestamp
  })),
  commonIssues: errorResults.logs.map(log => ({
    project: log.project_name,
    issue: log.failures || log.blockers,
    timestamp: log.timestamp
  }))
};

console.log('Knowledge base created:', knowledgeBase);
```

### Batch Data Analysis

```javascript
// Analyze work patterns over time
const recentLogs = await mcp.call('get_logs', {
  start_date: '2024-01-01T00:00:00.000Z',
  end_date: '2024-12-31T23:59:59.999Z',
  limit: 1000
});

// Group by date
const workByDate = new Map();
recentLogs.logs.forEach(log => {
  const date = log.timestamp.split('T')[0];
  if (!workByDate.has(date)) {
    workByDate.set(date, { total: 0, projects: new Set() });
  }
  const dateData = workByDate.get(date);
  dateData.total++;
  dateData.projects.add(log.project_name);
});

// Find most active days
const activityAnalysis = Array.from(workByDate.entries())
  .map(([date, data]) => ({
    date,
    totalLogs: data.total,
    uniqueProjects: data.projects.size
  }))
  .sort((a, b) => b.totalLogs - a.totalLogs);

console.log('Most active days:', activityAnalysis.slice(0, 10));
```

## Integration Scenarios

### CI/CD Pipeline Integration

```javascript
// In your deployment script
async function logDeployment(version, environment) {
  await mcp.call('create_log', {
    project_name: 'deployment-tracking',
    work_content: `Deployed version ${version} to ${environment}`,
    successes: 'Deployment completed successfully',
    thoughts: `Version ${version} includes new authentication features`,
    new_session: true
  });
}

// In your test script
async function logTestResults(testSuite, results) {
  const failures = results.failed.length > 0 
    ? `Failed tests: ${results.failed.join(', ')}`
    : undefined;
    
  const successes = results.passed.length > 0
    ? `Passed ${results.passed.length} tests`
    : undefined;

  await mcp.call('create_log', {
    project_name: 'automated-testing',
    work_content: `Ran ${testSuite} test suite`,
    successes,
    failures,
    blockers: results.failed.length > 5 ? 'Too many test failures - investigate' : undefined,
    new_session: true
  });
}
```

### AI Agent Development Integration

```javascript
// For AI agents working on code generation
class AIWorkLogger {
  constructor(mcpClient, projectName) {
    this.mcp = mcpClient;
    this.projectName = projectName;
    this.currentSession = null;
  }

  async startWorkSession(description) {
    const response = await this.mcp.call('create_log', {
      project_name: this.projectName,
      work_content: description,
      thoughts: 'Starting new AI-assisted development session',
      new_session: true
    });
    this.currentSession = response.sessionId;
    return this.currentSession;
  }

  async logProgress(workDone, successes, issues) {
    if (!this.currentSession) {
      throw new Error('No active session. Call startWorkSession first.');
    }

    return await this.mcp.call('create_log', {
      project_name: this.projectName,
      work_content: workDone,
      successes: successes,
      failures: issues,
      session_id: this.currentSession
    });
  }

  async logBlocker(description, analysis) {
    return await this.mcp.call('create_log', {
      project_name: this.projectName,
      work_content: 'Encountered blocker requiring attention',
      blockers: description,
      thoughts: analysis,
      session_id: this.currentSession
    });
  }

  async completeSession(summary) {
    const response = await this.mcp.call('create_log', {
      project_name: this.projectName,
      work_content: 'Completed work session',
      successes: summary,
      thoughts: 'Work session completed successfully',
      session_id: this.currentSession
    });
    
    this.currentSession = null;
    return response;
  }
}

// Usage in AI agent
const logger = new AIWorkLogger(mcpClient, 'ai-code-generation');
await logger.startWorkSession('Implementing user authentication system');
await logger.logProgress(
  'Generated user model and authentication middleware',
  'Code generation completed without syntax errors',
  'Some edge cases in validation logic need review'
);
```

### Development Team Integration

```javascript
// Team lead reviewing project progress
async function generateProjectReport(projectName, days = 7) {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const logs = await mcp.call('get_logs', {
    project_name: projectName,
    start_date: startDate,
    end_date: endDate,
    limit: 200
  });

  // Aggregate by session (representing work periods)
  const sessions = new Map();
  logs.logs.forEach(log => {
    if (!sessions.has(log.session_id)) {
      sessions.set(log.session_id, {
        logs: [],
        firstTimestamp: log.timestamp,
        lastTimestamp: log.timestamp
      });
    }
    const session = sessions.get(log.session_id);
    session.logs.push(log);
    if (log.timestamp < session.firstTimestamp) {
      session.firstTimestamp = log.timestamp;
    }
    if (log.timestamp > session.lastTimestamp) {
      session.lastTimestamp = log.timestamp;
    }
  });

  // Generate report
  const report = {
    projectName,
    reportPeriod: { startDate, endDate },
    totalSessions: sessions.size,
    totalLogs: logs.totalCount,
    sessionSummaries: Array.from(sessions.entries()).map(([sessionId, data]) => ({
      sessionId,
      duration: new Date(data.lastTimestamp) - new Date(data.firstTimestamp),
      logCount: data.logs.length,
      hasSuccesses: data.logs.some(log => log.successes),
      hasBlockers: data.logs.some(log => log.blockers),
      keyAchievements: data.logs
        .filter(log => log.successes)
        .map(log => log.successes)
        .slice(0, 3)
    }))
  };

  return report;
}
```

## Configuration Examples

### Database Configuration

```javascript
// Custom database path
process.env.WORKLOG_DB_PATH = '/custom/path/to/worklog.db';

// For testing with temporary database
const testDbPath = path.join(__dirname, 'test', `test-${Date.now()}.db`);
process.env.WORKLOG_DB_PATH = testDbPath;
```

### MCP Server Configuration

```json
{
  "mcpServers": {
    "worklog-dev": {
      "command": "node",
      "args": ["/path/to/worklog-mcp/dist/index.js"],
      "env": {
        "WORKLOG_DB_PATH": "/home/user/dev-worklog.db",
        "NODE_ENV": "development"
      }
    },
    "worklog-prod": {
      "command": "node",
      "args": ["/path/to/worklog-mcp/dist/index.js"],
      "env": {
        "WORKLOG_DB_PATH": "/var/lib/worklog/production.db",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Error Handling Examples

### Comprehensive Error Handling

```javascript
async function safeCreateLog(params) {
  try {
    const response = await mcp.call('create_log', params);
    return { success: true, data: response };
  } catch (error) {
    // Parse MCP error response
    const errorData = JSON.parse(error.message);
    
    switch (errorData.error.type) {
      case 'ValidationError':
        console.log(`Validation failed for field: ${errorData.error.details.field}`);
        console.log(`Provided value: ${errorData.error.details.providedValue}`);
        return {
          success: false,
          type: 'validation',
          field: errorData.error.details.field,
          message: errorData.error.message
        };
        
      case 'StorageError':
        console.log(`Storage operation failed: ${errorData.error.details.operation}`);
        if (errorData.error.details.isRetryable) {
          console.log('Error is retryable, implementing backoff...');
          // Implement retry logic
        }
        return {
          success: false,
          type: 'storage',
          retryable: errorData.error.details.isRetryable,
          message: errorData.error.message
        };
        
      case 'SessionError':
        console.log(`Session error for: ${errorData.error.details.sessionId}`);
        return {
          success: false,
          type: 'session',
          sessionId: errorData.error.details.sessionId,
          message: errorData.error.message
        };
        
      default:
        console.log(`Unknown error type: ${errorData.error.type}`);
        return {
          success: false,
          type: 'unknown',
          message: errorData.error.message
        };
    }
  }
}

// Usage with error handling
const result = await safeCreateLog({
  project_name: 'my-project',
  work_content: 'Some work description',
  new_session: true
});

if (!result.success) {
  if (result.type === 'validation') {
    console.log(`Please fix the ${result.field} field: ${result.message}`);
  } else if (result.type === 'storage' && result.retryable) {
    console.log('Retrying operation...');
    // Implement retry logic
  }
}
```

### Retry Logic Implementation

```javascript
async function createLogWithRetry(params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await safeCreateLog(params);
    
    if (result.success) {
      return result;
    }
    
    if (result.type === 'storage' && result.retryable && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    // Non-retryable error or max retries reached
    throw new Error(`Failed after ${attempt} attempts: ${result.message}`);
  }
}
```

### Input Validation Helper

```javascript
function validateLogInput(params) {
  const errors = [];
  
  // Project name validation
  if (!params.project_name || typeof params.project_name !== 'string') {
    errors.push('project_name is required and must be a string');
  } else if (params.project_name.length > 100) {
    errors.push('project_name must be 100 characters or less');
  } else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(params.project_name)) {
    errors.push('project_name must start with alphanumeric and contain only letters, numbers, hyphens, and underscores');
  }
  
  // Work content validation
  if (!params.work_content || typeof params.work_content !== 'string') {
    errors.push('work_content is required and must be a string');
  } else if (params.work_content.length > 10000) {
    errors.push('work_content must be 10,000 characters or less');
  }
  
  // Session management validation
  const hasSessionId = params.session_id && typeof params.session_id === 'string';
  const hasNewSession = params.new_session === true;
  
  if (!hasSessionId && !hasNewSession) {
    errors.push('Either session_id or new_session=true must be provided');
  }
  
  if (hasSessionId && hasNewSession) {
    errors.push('Cannot specify both session_id and new_session=true');
  }
  
  return errors;
}

// Usage
const inputErrors = validateLogInput(params);
if (inputErrors.length > 0) {
  console.log('Input validation failed:');
  inputErrors.forEach(error => console.log(`- ${error}`));
  return;
}

// Proceed with MCP call
const result = await createLogWithRetry(params);
```

This comprehensive usage guide provides practical examples for integrating the AI Agent Work Log MCP Server into various development workflows and scenarios.