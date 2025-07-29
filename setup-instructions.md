# Setting up AI Agent Work Log MCP Server

## Quick Setup for Claude Code (Recommended)

1. **Build the server:**
   ```bash
   cd /path/to/worklog-mcp
   npm run build
   ```

2. **Add globally to Claude Code:**
   ```bash
   claude mcp add worklog worklog-mcp --scope user
   ```

3. **Verify setup:**
   ```bash
   claude mcp list
   ```

   You should see: `worklog: worklog-mcp - ✓ Connected`

## Alternative Setup for Claude Desktop

1. **Build the server:**
   ```bash
   cd /path/to/worklog-mcp
   npm run build
   ```

2. **Add to Claude Desktop config:**
   
   Open your Claude Desktop config file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

3. **Add this MCP server configuration:**
   ```json
   {
     "mcpServers": {
       "worklog-mcp": {
         "command": "node",
         "args": ["dist/cli.js", "--stdio"],
         "cwd": "/path/to/worklog-mcp"
       }
     }
   }
   ```

4. **Restart Claude Desktop**

## Available MCP Tools

Once connected, you'll have access to these tools:

- **`create_log`** - Create new work log entries
  - Required: `project_name`, `work_content`
  - Optional: `session_id`, `successes`, `failures`, `blockers`, `thoughts`

- **`get_logs`** - Retrieve logs with filtering
  - Optional: `project_name`, `session_id`, `start_date`, `end_date`, `limit`, `offset`

- **`get_session_logs`** - Get logs for a specific session
  - Required: `session_id`

- **`search_logs`** - Search logs by content
  - Required: `query`
  - Optional: `fields` (array), `limit`

## Test the Connection

You can test if the server is working by running:
```bash
cd /path/to/worklog-mcp
npm start
```

This starts the server in stdio mode. Press Ctrl+C to stop.

## Database Location

By default, logs are stored in `worklog.db` in the project directory. You can customize this with the `WORKLOG_DB_PATH` environment variable.

## Usage Example

After setup, you can ask Claude to:
- "Create a log entry for my work on implementing the search feature"
- "Show me all logs for project 'ai-worklog-mcp'"
- "Search for logs containing 'authentication'"
- "Get all logs from today's session"

The MCP server will handle all the database operations and return structured responses.