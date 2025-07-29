# AI Agent Work Log MCP Server - API Reference

## Overview

The AI Agent Work Log MCP Server provides a Model Context Protocol (MCP) interface for AI agents to save and manage work logs with session management, search capabilities, and comprehensive validation.

## MCP Tools

### create_log

Creates a new work log entry with session management.

**Parameters:**
- `project_name` (string, required): Project identifier (1-100 chars, alphanumeric with hyphens/underscores)
- `work_content` (string, required): Description of work performed (1-10,000 chars)
- `session_id` (string, optional): Existing session ID to continue
- `new_session` (boolean, optional): Create new session (cannot be used with session_id)
- `successes` (string, optional): Successful outcomes (0-10,000 chars)
- `failures` (string, optional): Failed attempts or issues (0-10,000 chars)
- `blockers` (string, optional): Current blockers or obstacles (0-10,000 chars)
- `thoughts` (string, optional): Thoughts, insights, or next steps (0-10,000 chars)

**Session Management:**
- Either `session_id` OR `new_session=true` must be provided
- Cannot specify both `session_id` and `new_session` simultaneously
- New sessions generate IDs with format: `claude-code-{project}-{date}-{timestamp}`

**Response Format:**
```json
{
  "success": true,
  "logId": "uuid-v4",
  "sessionId": "claude-code-project-2025-07-25-123456",
  "timestamp": "2025-07-25T14:30:00.000Z",
  "message": "New session created" | "Session continued"
}
```

**Error Response:**
```json
{
  "error": {
    "type": "ValidationError" | "StorageError" | "SessionError" | "MCPError",
    "message": "Error description",
    "details": {
      "field": "fieldName",
      "providedValue": "invalidValue"
    }
  },
  "success": false,
  "timestamp": "2025-07-25T14:30:00.000Z"
}
```

### get_logs

Retrieves work logs with optional filtering and pagination.

**Parameters:**
- `limit` (number, optional): Maximum logs to return (0-1000, default: 50)
- `offset` (number, optional): Number of logs to skip (default: 0)
- `project_name` (string, optional): Filter by project name
- `session_id` (string, optional): Filter by session ID
- `start_date` (string, optional): Filter logs from this date (ISO 8601 format)
- `end_date` (string, optional): Filter logs until this date (ISO 8601 format)

**Response Format:**
```json
{
  "logs": [
    {
      "id": "uuid-v4",
      "project_name": "project-name",
      "session_id": "claude-code-project-2025-07-25-123456",
      "work_content": "Work description",
      "successes": "Success description",
      "failures": "Failure description",
      "blockers": "Blocker description",
      "thoughts": "Thoughts and insights",
      "timestamp": "2025-07-25T14:30:00.000Z"
    }
  ],
  "totalCount": 25,
  "hasMore": true
}
```

### get_session_logs

Retrieves all logs for a specific session.

**Parameters:**
- `session_id` (string, required): Session ID to retrieve logs for

**Response Format:**
```json
{
  "sessionId": "claude-code-project-2025-07-25-123456",
  "logs": [
    {
      "id": "uuid-v4",
      "project_name": "project-name",
      "session_id": "claude-code-project-2025-07-25-123456",
      "work_content": "Work description",
      "successes": "Success description",
      "failures": "Failure description",
      "blockers": "Blocker description",
      "thoughts": "Thoughts and insights",
      "timestamp": "2025-07-25T14:30:00.000Z"
    }
  ],
  "totalCount": 5
}
```

### search_logs

Searches logs by content with full-text search capabilities.

**Parameters:**
- `query` (string, required): Search query string (1-1000 chars)
- `fields` (array, optional): Fields to search in (default: all text fields)
  - Available fields: `work_content`, `successes`, `failures`, `blockers`, `thoughts`
- `limit` (number, optional): Maximum results to return (0-1000, default: 50)

**Response Format:**
```json
{
  "logs": [
    {
      "id": "uuid-v4",
      "project_name": "project-name",
      "session_id": "claude-code-project-2025-07-25-123456",
      "work_content": "Work description containing query terms",
      "successes": "Success description",
      "failures": "Failure description",
      "blockers": "Blocker description",
      "thoughts": "Thoughts and insights",
      "timestamp": "2025-07-25T14:30:00.000Z"
    }
  ],
  "totalResults": 15
}
```

## Validation Rules

### Project Names
- Must start with alphanumeric character
- Can contain letters, numbers, hyphens, and underscores
- Length: 1-100 characters
- Examples: `my-project`, `project_123`, `Project-Name-2024`

### Session IDs
- Must start with alphanumeric character
- Can contain letters, numbers, hyphens, underscores, and dots
- Length: 1-255 characters
- Auto-generated format: `claude-code-{project}-{YYYY-MM-DD}-{timestamp}`

### Content Fields
- All text fields are sanitized to remove HTML tags
- Special characters are escaped to prevent injection attacks
- Maximum length: 10,000 characters per field

### Timestamps
- Must be valid ISO 8601 format
- Reasonable bounds: 2020 to current year + 5
- Example: `2025-07-25T14:30:00.000Z`

## Error Types

### ValidationError
Thrown when input parameters fail validation rules.

**Common Causes:**
- Empty required fields
- Invalid field formats
- Field length violations
- Invalid timestamp formats

### StorageError
Thrown when database operations fail.

**Properties:**
- `operation`: Database operation that failed
- `isRetryable`: Whether the operation can be retried

### SessionError
Thrown when session management operations fail.

**Common Causes:**
- Invalid session ID format
- Session not found
- Session ownership conflicts

### MCPError
Thrown when MCP tool operations fail.

**Properties:**
- `toolName`: Name of the MCP tool
- `code`: Error code for categorization

## Security Features

### Input Sanitization
- HTML tags are removed from all text fields
- Special characters are escaped to prevent SQL injection
- Path traversal attempts are blocked

### Validation
- Comprehensive input validation for all parameters
- Type checking and format validation
- Length and boundary validation

### Error Handling
- Consistent error response format
- Detailed error information for debugging
- Graceful degradation on failures

## Database Schema

### work_logs Table
```sql
CREATE TABLE work_logs (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  work_content TEXT NOT NULL,
  successes TEXT,
  failures TEXT,
  blockers TEXT,
  thoughts TEXT,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_project_timestamp`: `(project_name, timestamp DESC)`
- `idx_session_timestamp`: `(session_id, timestamp DESC)`
- `idx_timestamp`: `(timestamp DESC)`

## Configuration

### Environment Variables
- `WORKLOG_DB_PATH`: Path to SQLite database file
- `NODE_ENV`: Environment mode (development, test, production)

### Default Settings
- Default limit: 50 logs
- Maximum limit: 1000 logs
- Default search fields: all text fields
- Session ID format: `claude-code-{project}-{YYYY-MM-DD}-{timestamp}`

## Usage Examples

### Creating a New Session
```javascript
// Create first log with new session
const result = await createLogTool(storageManager, {
  project_name: 'my-project',
  work_content: 'Started implementing authentication system',
  successes: 'Set up basic user model and database schema',
  failures: 'Had issues with password hashing configuration',
  blockers: 'Need to choose between bcrypt and argon2',
  thoughts: 'Consider security requirements and performance trade-offs',
  new_session: true
});

// Extract session ID for future logs
const sessionId = result.sessionId;
```

### Continuing a Session
```javascript
// Add more work to existing session
const result = await createLogTool(storageManager, {
  project_name: 'my-project',
  work_content: 'Completed authentication implementation',
  successes: 'Implemented JWT token generation and validation',
  session_id: sessionId
});
```

### Searching and Filtering
```javascript
// Search for specific content
const searchResult = await searchLogsTool(storageManager, {
  query: 'authentication issues',
  fields: ['work_content', 'failures'],
  limit: 20
});

// Get recent logs for a project
const recentLogs = await getLogsTool(storageManager, {
  project_name: 'my-project',
  limit: 10,
  offset: 0
});

// Get all logs from a session
const sessionLogs = await getSessionLogsTool(storageManager, {
  session_id: sessionId
});
```

### Error Handling
```javascript
try {
  const result = await createLogTool(storageManager, {
    project_name: '', // Invalid: empty project name
    work_content: 'Some work',
    new_session: true
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.message}`);
    console.log(`Field: ${error.field}, Value: ${error.providedValue}`);
  }
}
```

## Best Practices

### Session Management
1. Create new sessions for distinct work periods or major milestones
2. Continue sessions for related work within the same context
3. Use descriptive project names for easy organization
4. Include all relevant information in each log entry

### Content Organization
1. Use `work_content` for the main work description
2. Use `successes` to document what went well
3. Use `failures` to track issues and obstacles encountered
4. Use `blockers` for current impediments requiring attention
5. Use `thoughts` for insights, next steps, and reflections

### Search and Retrieval
1. Use specific search terms for better results
2. Leverage field filtering to narrow search scope
3. Use pagination for large result sets
4. Filter by project or session for focused views

### Error Handling
1. Always handle validation errors gracefully
2. Implement retry logic for retryable storage errors
3. Log errors for debugging and monitoring
4. Provide meaningful error messages to users