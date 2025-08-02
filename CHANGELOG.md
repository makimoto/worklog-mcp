# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-08-02

### Added
- AI Agent Guide documentation (docs/AI_AGENT_GUIDE.md) - comprehensive guide for AI agents to effectively use worklog-mcp
- Added link to AI Agent Guide in README.md documentation section

### Changed
- Updated README.md to reflect that the package is now published on npm
- Clarified the difference between local development options (Direct Path vs npm link)
- Fixed all references from "Claude Desktop" to "Claude Code" for accuracy

### Documentation
- Created comprehensive AI Agent Guide with best practices, examples, and integration tips
- Reorganized documentation structure by moving AI_AGENT_GUIDE.md to docs/ directory

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