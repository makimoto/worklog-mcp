# AI Agent Work Log MCP Server

A comprehensive Model Context Protocol (MCP) server for AI agents to save and manage work logs with session management, search capabilities, and robust validation.

## Features

- **Session Management**: Organize work logs into logical sessions with automatic ID generation
- **Full-Text Search**: Search across all work log content with field-specific filtering
- **Comprehensive Validation**: Input sanitization, type checking, and security measures
- **Error Handling**: Robust error handling with detailed error responses
- **Multiple Output Formats**: JSON, table, and markdown output support
- **SQLite Storage**: Reliable, file-based storage with automatic migrations
- **TypeScript**: Full TypeScript support with comprehensive type definitions

## Quick Start

### Installation

**For Published Package**:
```bash
npm install worklog-mcp
```

**For Local Development**:
```bash
# Clone the repository
git clone https://github.com/makimoto/worklog-mcp.git
cd worklog-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### MCP Server Setup

**Option 1: Local Development Setup (Current)**

```bash
# Using Claude Desktop with local path
claude mcp add worklog node /path/to/worklog-mcp/dist/index.js
```

Or add to your MCP configuration manually (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "worklog": {
      "command": "node",
      "args": ["/path/to/worklog-mcp/dist/index.js"],
      "env": {
        "WORKLOG_DB_PATH": "~/.worklog/work_logs.db"
      }
    }
  }
}
```

**Option 2: Using npm link (Local Development)**

```bash
# In the project directory
npm link

# Then add to Claude Desktop
claude mcp add worklog worklog-mcp
```

**Option 3: When Published (Future)**

```bash
# Add MCP server to Claude Desktop
claude mcp add worklog npx worklog-mcp
```

### Basic Usage

```javascript
// Create a new work log entry with a new session
const response = await mcp.call('create_log', {
  project_name: 'my-project',
  work_content: 'Implemented user authentication system',
  successes: 'Successfully set up JWT token generation',
  failures: 'Had some issues with password validation',
  blockers: 'Need to implement password reset functionality',
  thoughts: 'Consider implementing OAuth 2.0 for future versions',
  new_session: true
});

// Continue working in the same session
await mcp.call('create_log', {
  project_name: 'my-project',
  work_content: 'Added password reset functionality',
  successes: 'Email-based password reset working correctly',
  session_id: response.sessionId
});

// Search for specific content
const searchResults = await mcp.call('search_logs', {
  query: 'authentication issues',
  fields: ['work_content', 'failures'],
  limit: 10
});

// Get all logs for a project
const projectLogs = await mcp.call('get_logs', {
  project_name: 'my-project',
  limit: 50
});
```

### CLI Usage

The package also provides a CLI for direct interaction:

```bash
# List recent work logs
worklog list --project my-project --limit 10

# Search for specific content
worklog search "authentication issues" --fields work_content failures

# Show all logs for a session
worklog show claude-code-my-project-2025-01-01-123456

# Display work summary
worklog summary --project my-project --period week

# Manage configuration
worklog config show
worklog config set databasePath ~/custom-worklog.db
```

## Documentation

- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation with all MCP tools, parameters, and response formats
- **[Usage Examples](docs/USAGE_EXAMPLES.md)** - Comprehensive examples for various workflows and integration scenarios

## MCP Tools

| Tool | Description |
|------|-------------|
| `create_log` | Create a new work log entry with session management |
| `get_logs` | Retrieve work logs with filtering and pagination |
| `get_session_logs` | Get all logs for a specific session |
| `search_logs` | Full-text search across work log content |

## Data Structure

Work logs contain the following fields:

- **project_name**: Project identifier (required)
- **work_content**: Description of work performed (required)
- **session_id**: Session identifier for grouping related work
- **successes**: Successful outcomes and achievements
- **failures**: Issues encountered or failed attempts
- **blockers**: Current obstacles requiring attention
- **thoughts**: Insights, reflections, and next steps
- **timestamp**: When the work was logged

## Troubleshooting

### MCP Server Connection Issues

If you encounter connection errors, try these solutions:

1. **Clear existing MCP configuration**:
   ```bash
   claude mcp remove worklog-mcp       # Remove old entries if any
   claude mcp remove worklog           # Remove old entries if any
   ```

2. **Re-add the server**:
   ```bash
   claude mcp add worklog npx worklog-mcp
   ```

3. **Verify the configuration**:
   ```bash
   claude mcp list
   ```

4. **Check that the package is accessible**:
   ```bash
   npx worklog-mcp --help
   ```

### Database Issues

- **Database path**: Default is `~/.worklog/work_logs.db`
- **Custom path**: Set `WORKLOG_DB_PATH` environment variable
- **Permissions**: Ensure write access to the database directory

## Session Management

Sessions help organize related work entries:

- **New Session**: Use `new_session: true` to start a new session
- **Continue Session**: Use `session_id` to add to an existing session
- **Auto-Generated IDs**: Format: `claude-code-{project}-{date}-{timestamp}`
- **Session Validation**: Ensures session continuity and project association

## Search Capabilities

Powerful search features for finding relevant work logs:

- **Full-Text Search**: Search across all text fields
- **Field Filtering**: Limit search to specific fields
- **Project Filtering**: Search within specific projects
- **Date Filtering**: Find logs within date ranges
- **Pagination**: Handle large result sets efficiently

## Validation & Security

Comprehensive input validation and security measures:

- **Input Sanitization**: HTML tag removal and special character escaping
- **Type Validation**: Strict type checking for all parameters
- **Length Limits**: Configurable limits for all text fields
- **Format Validation**: Project names, session IDs, and timestamps
- **SQL Injection Protection**: Parameterized queries and input escaping
- **XSS Prevention**: HTML sanitization for all user content

## Storage

SQLite-based storage with advanced features:

- **Automatic Migrations**: Database schema versioning
- **Optimized Indexes**: Fast queries for common access patterns
- **Transaction Support**: Data consistency and reliability
- **Configurable Path**: Flexible database file location
- **Backup-Friendly**: Standard SQLite file format

## Configuration

### Environment Variables

- `WORKLOG_DB_PATH`: Path to SQLite database file (default: `./worklog.db`)
- `NODE_ENV`: Environment mode (`development`, `test`, `production`)

### Default Settings

- **Default Limit**: 50 logs per query
- **Maximum Limit**: 1000 logs per query
- **Max Field Length**: 10,000 characters
- **Session ID Format**: `claude-code-{project}-{YYYY-MM-DD}-{timestamp}`

## Development

### Building from Source

```bash
git clone <repository-url>
cd worklog-mcp
npm install
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- tests/unit/
npm test -- tests/integration/
npm test -- tests/e2e/
```

## Development

### Local Development Setup

```bash
# Clone and setup
git clone https://github.com/makimoto/worklog-mcp.git
cd worklog-mcp
npm install

# Development mode (watch for changes)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Format code
npm run format
```

### Testing the MCP Server Locally

1. **Direct node execution**:
   ```bash
   node dist/index.js
   ```

2. **With environment variables**:
   ```bash
   WORKLOG_DB_PATH=./test.db node dist/index.js
   ```

3. **Test CLI commands**:
   ```bash
   # Using the CLI directly
   node dist/cli/index.js list
   node dist/cli/index.js search "test query"
   node dist/cli/index.js config show
   ```

### Local MCP Integration

**Option 1: Absolute Path**
```bash
claude mcp add worklog node /path/to/worklog-mcp/dist/index.js
```

**Option 2: npm link**
```bash
# In the project directory
npm link

# Then use globally
claude mcp add worklog worklog-mcp
```

**Option 3: Manual Configuration**

Edit `~/.claude/config.json`:
```json
{
  "mcpServers": {
    "worklog": {
      "command": "node",
      "args": ["/absolute/path/to/worklog-mcp/dist/index.js"],
      "env": {
        "WORKLOG_DB_PATH": "~/.worklog/work_logs.db"
      }
    }
  }
}
```

### Debug Mode

```bash
# Run Claude Desktop with debug output
claude --debug
```

This shows detailed MCP server connection logs and errors.

### Available Scripts

```bash
npm run build        # Build TypeScript to JavaScript
npm run dev          # Watch mode for development
npm run test         # Run test suite
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run clean        # Clean build directory
```

## Project Structure

```
worklog-mcp/
├── src/
│   ├── cli/           # CLI interface and commands
│   ├── config/        # Configuration management
│   ├── display/       # Output formatting (JSON, table, markdown)
│   ├── mcp/           # MCP server and tools
│   ├── models/        # Data models, validation, and error handling
│   └── storage/       # Database layer and migrations
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
├── docs/              # API documentation and examples
└── dist/              # Compiled JavaScript output
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the test suite
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for API changes
- Use conventional commit messages
- Ensure all tests pass before submitting

## License

[MIT License](LICENSE) - see the LICENSE file for details.

## Issue Reporting

Please report issues on the [GitHub Issues](https://github.com/makimoto/worklog-mcp/issues) page with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Relevant log output

---

For detailed API documentation, usage examples, and integration guides, see the [docs](docs/) directory.
