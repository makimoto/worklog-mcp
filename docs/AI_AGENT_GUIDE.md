# AI Agent Guide for worklog-mcp

This document provides guidance for AI Agents (Claude Code, Cursor, Cline, etc.) to effectively use worklog-mcp for structured work logging and management.

## Overview

worklog-mcp is an MCP (Model Context Protocol) server that enables AI Agents to record and manage structured work logs with session management, full-text search, and comprehensive validation capabilities.

## Primary Use Cases

1. **Work Documentation**: Record tasks performed and changes made
2. **Issue Tracking**: Document errors, problems, and their resolutions
3. **Progress Visibility**: Clearly communicate work progress to users
4. **Knowledge Preservation**: Save important discoveries and insights for future reference

## Basic Usage

### 1. Starting a New Session

Use when beginning a new task or work period:

```javascript
await mcp.call('mcp__worklog__create_log', {
  project_name: 'my-project',
  work_content: 'Started implementing user authentication system',
  successes: 'Set up basic user model and database schema',
  failures: 'Had issues with password hashing configuration',
  blockers: 'Need to decide between bcrypt and argon2',
  thoughts: 'Should consider security requirements vs performance trade-offs',
  new_session: true
});
```

### 2. Continuing an Existing Session

When continuing work within the same context:

```javascript
await mcp.call('mcp__worklog__create_log', {
  project_name: 'my-project',
  work_content: 'Completed authentication implementation',
  successes: 'Implemented JWT token generation and validation',
  session_id: 'claude-code-my-project-2025-07-30-123456'
});
```

### 3. Searching Past Work

Search for relevant past work:

```javascript
// Search by keywords
const results = await mcp.call('mcp__worklog__search_logs', {
  query: 'authentication error',
  fields: ['work_content', 'failures'],
  limit: 10
});

// Get recent logs for a project
const recentLogs = await mcp.call('mcp__worklog__get_logs', {
  project_name: 'my-project',
  limit: 20
});
```

## Field Usage Guidelines

### work_content (required)
- Record specific work performed
- Examples: "Refactored React components", "Implemented API endpoints"

### successes
- Document successful outcomes and achievements
- Examples: "All tests passing", "Performance improved by 30%"

### failures
- Record problems encountered and failed attempts
- Examples: "Unable to resolve TypeScript type errors", "Build failing"

### blockers
- Current obstacles requiring resolution
- Examples: "Environment variables not configured", "Dependency conflicts"

### thoughts
- Insights, next steps, and questions
- Examples: "May need to reconsider this approach", "Need user confirmation"

## Best Practices

### 1. Session Management

```javascript
// Starting a major new task
new_session: true

// Continuing related work
session_id: 'existing-session-id'
```

### 2. Detailed Recording

```javascript
// Good: Specific and searchable
work_content: 'Implemented JWT validation logic in UserAuthentication component',
failures: 'jwt.verify() throwing TokenExpiredError - token expiry too short'

// Bad: Vague and hard to search
work_content: 'Updated code',
failures: 'Got an error'
```

### 3. Real-time Logging

Log at important milestones rather than batching at the end:

```javascript
// Step 1: Investigation phase
await mcp.call('mcp__worklog__create_log', {
  project_name: 'api-integration',
  work_content: 'Investigated third-party API specifications',
  successes: 'Found API documentation and understood auth method',
  new_session: true
});

// Step 2: Implementation phase
await mcp.call('mcp__worklog__create_log', {
  project_name: 'api-integration',
  work_content: 'Completed basic API integration',
  successes: 'GET/POST requests working correctly',
  failures: 'Rate limiting not yet implemented',
  session_id: sessionId
});
```

### 4. Error and Solution Documentation

```javascript
// Recording an error
await mcp.call('mcp__worklog__create_log', {
  project_name: 'frontend-app',
  work_content: 'Investigating build error',
  failures: 'Webpack config throwing Module not found error',
  blockers: 'Possible corrupted node_modules dependencies',
  session_id: sessionId
});

// Recording the solution
await mcp.call('mcp__worklog__create_log', {
  project_name: 'frontend-app',
  work_content: 'Resolved build error',
  successes: 'Fixed by reinstalling dependencies with npm install --force',
  thoughts: 'Root cause was package-lock.json conflict',
  session_id: sessionId
});
```

## Validation Rules

### Project Names
- Only alphanumeric characters, hyphens, and underscores
- 1-100 characters
- Examples: `my-project`, `project_123`, `api-v2`

### Session IDs
- Auto-generated format: `claude-code-{project}-{YYYY-MM-DD}-{timestamp}`
- Recommended to follow this format even for manual IDs

### Text Fields
- Maximum 10,000 characters
- HTML tags are automatically removed
- Special characters are escaped

## Error Handling

```javascript
try {
  const result = await mcp.call('mcp__worklog__create_log', {
    // ... parameters
  });
} catch (error) {
  // ValidationError: Invalid input parameters
  // StorageError: Database operation failure
  // SessionError: Session management issues
  
  console.error('Failed to create log:', error.message);
  // Notify user and continue work
}
```

## Practical Examples

### 1. Bug Fix Documentation

```javascript
// Bug discovery
await mcp.call('mcp__worklog__create_log', {
  project_name: 'e-commerce-site',
  work_content: 'Investigated bug in checkout process',
  failures: 'Cart total calculation mixing tax-inclusive and exclusive prices',
  blockers: 'Price calculation logic specification unclear',
  new_session: true
});

// Fix implementation
await mcp.call('mcp__worklog__create_log', {
  project_name: 'e-commerce-site',
  work_content: 'Fixed cart calculation logic',
  successes: 'Unified all amounts to be tax-inclusive',
  thoughts: 'Should add test cases to prevent regression',
  session_id: sessionId
});
```

### 2. Feature Development

```javascript
// Planning phase
await mcp.call('mcp__worklog__create_log', {
  project_name: 'user-dashboard',
  work_content: 'Started dashboard feature design',
  successes: 'Created UI wireframes',
  thoughts: 'Considering real-time data update implementation',
  new_session: true
});

// Implementation phase
await mcp.call('mcp__worklog__create_log', {
  project_name: 'user-dashboard',
  work_content: 'Basic dashboard component implementation',
  successes: 'Charts display and data fetching working',
  failures: 'WebSocket real-time updates still unstable',
  session_id: sessionId
});
```

### 3. Code Review Documentation

```javascript
await mcp.call('mcp__worklog__create_log', {
  project_name: 'api-backend',
  work_content: 'Code review for pull request #123',
  successes: 'No security issues found',
  failures: 'Discovered insufficient error handling',
  thoughts: 'Should share error handling best practices with team',
  session_id: sessionId
});
```

## Integration Tips

### For Claude Code

Add to CLAUDE.md file:

```markdown
* Use the AI Agent Work Log MCP server for all activity logging
* Log format should include:
  * project_name: Current project identifier
  * work_content: What did you do
  * successes: What went well
  * failures: What didn't go well
  * blockers: Current obstacles
  * thoughts: Next steps and insights
```

### Automation Example

```javascript
// Integrating Todo list with Worklog
async function completeTask(taskDescription, result) {
  // Mark todo as complete
  await markTodoComplete(taskDescription);
  
  // Log to worklog
  await mcp.call('mcp__worklog__create_log', {
    project_name: getCurrentProject(),
    work_content: `Completed task: ${taskDescription}`,
    successes: result.success ? result.message : null,
    failures: result.error ? result.error : null,
    session_id: getCurrentSessionId()
  });
}
```

## Summary

Effective use of worklog-mcp provides:

1. **Enhanced Transparency**: Users can clearly understand work being done
2. **Efficient Problem Solving**: Quick search for similar past issues and solutions
3. **Knowledge Accumulation**: Project history stored in searchable format
4. **Improved Collaboration**: Other AI Agents and users can reference past work

Always strive to record specific, searchable content and update in real-time as work progresses.
