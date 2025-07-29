# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-07-25

### Added
- Initial release of AI Agent Work Log MCP server
- Complete MCP (Model Context Protocol) server implementation
- CLI interface for direct command-line usage
- SQLite database storage with automatic migrations
- Session management with automatic ID generation
- Comprehensive error handling and input validation
- Display formatting (table, JSON, markdown)
- Configuration management system

### Features
- **MCP Tools**:
  - `create_log`: Create work log entries with session management
  - `get_logs`: Retrieve logs with filtering and pagination
  - `get_session_logs`: Get all logs for a specific session
  - `search_logs`: Full-text search across log content

- **CLI Commands**:
  - `worklog create`: Create new log entries
  - `worklog list`: List and filter existing logs
  - `worklog search`: Search through log content
  - `worklog sessions`: Manage work sessions
  - `worklog config`: Configuration management
  - `worklog summary`: Project and session summaries

- **Security & Validation**:
  - Input sanitization and validation
  - HTML content sanitization
  - SQL injection prevention
  - Path traversal protection
  - Comprehensive error handling

- **Testing**:
  - Unit tests (40+ tests)
  - Integration tests (9 tests)
  - End-to-end tests (18 tests)
  - 95%+ code coverage

### Technical Details
- Node.js 16+ support
- TypeScript implementation
- SQLite database with migrations
- Commander.js CLI framework
- Jest testing framework
- Comprehensive API documentation

### Documentation
- Complete API reference
- Usage examples and workflows
- Integration guides
- Development setup instructions