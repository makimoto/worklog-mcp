import { ValidationError } from './errors';

/**
 * Validation configuration options
 */
export interface ValidationOptions {
  maxStringLength?: number;
  allowHtml?: boolean;
  strictMode?: boolean;
}

/**
 * Default validation limits
 */
const DEFAULT_LIMITS = {
  PROJECT_NAME_MAX: 100,
  SESSION_ID_MAX: 255,
  WORK_CONTENT_MAX: 10000,
  OPTIONAL_FIELD_MAX: 10000,
  SEARCH_QUERY_MAX: 1000,
  MAX_LIMIT_VALUE: 1000,
  MIN_YEAR: 2020,
  MAX_FUTURE_YEARS: 5,
};

/**
 * Sanitize input by trimming whitespace from strings
 */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
}

/**
 * Validate string length constraints
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): void {
  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters long`,
      fieldName,
      value
    );
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be no more than ${maxLength} characters long`,
      fieldName,
      value
    );
  }
}

/**
 * Validate project name format and constraints
 */
export function validateProjectName(projectName: string): void {
  const sanitized = sanitizeInput(projectName) as string;

  if (!sanitized || sanitized.length === 0) {
    throw new ValidationError('Project name cannot be empty', 'projectName', projectName);
  }

  // Check length
  validateStringLength(sanitized, 'projectName', 1, DEFAULT_LIMITS.PROJECT_NAME_MAX);

  // Check format - alphanumeric, hyphens, underscores, but not starting with special chars
  const validFormat = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
  if (!validFormat.test(sanitized)) {
    throw new ValidationError(
      'Project name must start with alphanumeric character and contain only letters, numbers, hyphens, and underscores',
      'projectName',
      projectName
    );
  }
}

/**
 * Validate session ID format and constraints
 */
export function validateSessionId(sessionId: string): void {
  const sanitized = sanitizeInput(sessionId) as string;

  if (!sanitized || sanitized.length === 0) {
    throw new ValidationError('Session ID cannot be empty', 'sessionId', sessionId);
  }

  // Check length
  validateStringLength(sanitized, 'sessionId', 1, DEFAULT_LIMITS.SESSION_ID_MAX);

  // Check format - alphanumeric, hyphens, underscores, dots
  const validFormat = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
  if (!validFormat.test(sanitized)) {
    throw new ValidationError(
      'Session ID must start with alphanumeric character and contain only letters, numbers, hyphens, underscores, and dots',
      'sessionId',
      sessionId
    );
  }
}

/**
 * Validate optional fields (successes, failures, blockers, thoughts)
 */
export function validateOptionalFields(fields: Record<string, unknown>): void {
  const optionalFieldNames = ['successes', 'failures', 'blockers', 'thoughts'];

  for (const fieldName of optionalFieldNames) {
    const value = fields[fieldName];

    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string if provided`, fieldName, value);
      }

      validateStringLength(value, fieldName, 0, DEFAULT_LIMITS.OPTIONAL_FIELD_MAX);
    }
  }
}

/**
 * Check if timestamp is valid and within reasonable bounds
 */
export function isValidTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return false;
    }

    // Check if timestamp is in ISO format
    if (date.toISOString() !== timestamp) {
      return false;
    }

    // Check reasonable bounds
    const currentYear = new Date().getFullYear();
    const year = date.getFullYear();

    if (year < DEFAULT_LIMITS.MIN_YEAR || year > currentYear + DEFAULT_LIMITS.MAX_FUTURE_YEARS) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML content by removing tags and dangerous content
 */
export function sanitizeHtml(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Handle some common HTML entities
  sanitized = sanitized.replace(/&lt;/g, '<');
  sanitized = sanitized.replace(/&gt;/g, '>');
  sanitized = sanitized.replace(/&amp;/g, '&');
  sanitized = sanitized.replace(/&quot;/g, '"');
  sanitized = sanitized.replace(/&#x27;/g, "'");

  // Remove any remaining < or > that might be malformed HTML
  sanitized = sanitized.replace(/</g, '&lt;');

  return sanitized;
}

/**
 * Escape special characters that could be used for injection attacks
 */
export function escapeSpecialCharacters(input: string): string {
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\//g, '\\/') // Escape forward slashes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}

/**
 * Validate MCP tool parameters based on tool type
 */
export function validateMCPParameters(toolName: string, parameters: Record<string, unknown>): void {
  switch (toolName) {
    case 'create_log':
      validateCreateLogParameters(parameters);
      break;
    case 'get_logs':
      validateGetLogsParameters(parameters);
      break;
    case 'get_session_logs':
      validateGetSessionLogsParameters(parameters);
      break;
    case 'search_logs':
      validateSearchLogsParameters(parameters);
      break;
    default:
      throw new ValidationError(`Unknown MCP tool: ${toolName}`, 'toolName', toolName);
  }
}

/**
 * Validate create_log tool parameters
 */
function validateCreateLogParameters(params: Record<string, unknown>): void {
  // Required fields
  if (!params['project_name'] || typeof params['project_name'] !== 'string') {
    throw new ValidationError(
      'project_name is required and must be a string',
      'project_name',
      params['project_name']
    );
  }

  if (!params['work_content'] || typeof params['work_content'] !== 'string') {
    throw new ValidationError(
      'work_content is required and must be a string',
      'work_content',
      params['work_content']
    );
  }

  // Session management
  const hasSessionId = params['session_id'] && typeof params['session_id'] === 'string';
  const hasNewSession = params['new_session'] === true;

  if (!hasSessionId && !hasNewSession) {
    throw new ValidationError(
      'Either session_id or new_session=true must be provided',
      'session_id'
    );
  }

  if (hasSessionId && hasNewSession) {
    throw new ValidationError('Cannot specify both session_id and new_session=true', 'session_id');
  }

  // Validate field formats
  validateProjectName(params['project_name'] as string);
  validateStringLength(
    params['work_content'] as string,
    'work_content',
    1,
    DEFAULT_LIMITS.WORK_CONTENT_MAX
  );

  if (hasSessionId) {
    validateSessionId(params['session_id'] as string);
  }

  // Validate optional fields
  validateOptionalFields(params);
}

/**
 * Validate get_logs tool parameters
 */
function validateGetLogsParameters(params: Record<string, unknown>): void {
  if (params['limit'] !== undefined) {
    if (
      typeof params['limit'] !== 'number' ||
      params['limit'] < 0 ||
      params['limit'] > DEFAULT_LIMITS.MAX_LIMIT_VALUE
    ) {
      throw new ValidationError(
        `limit must be a number between 0 and ${DEFAULT_LIMITS.MAX_LIMIT_VALUE}`,
        'limit',
        params['limit']
      );
    }
  }

  if (params['offset'] !== undefined) {
    if (typeof params['offset'] !== 'number' || params['offset'] < 0) {
      throw new ValidationError('offset must be a non-negative number', 'offset', params['offset']);
    }
  }

  if (params['projectName'] !== undefined) {
    if (typeof params['projectName'] !== 'string') {
      throw new ValidationError(
        'projectName must be a string',
        'projectName',
        params['projectName']
      );
    }
    validateProjectName(params['projectName']);
  }

  if (params['sessionId'] !== undefined) {
    if (typeof params['sessionId'] !== 'string') {
      throw new ValidationError('sessionId must be a string', 'sessionId', params['sessionId']);
    }
    validateSessionId(params['sessionId']);
  }

  if (params['startDate'] !== undefined) {
    if (typeof params['startDate'] !== 'string' || !isValidTimestamp(params['startDate'])) {
      throw new ValidationError(
        'startDate must be a valid ISO timestamp',
        'startDate',
        params['startDate']
      );
    }
  }

  if (params['endDate'] !== undefined) {
    if (typeof params['endDate'] !== 'string' || !isValidTimestamp(params['endDate'])) {
      throw new ValidationError(
        'endDate must be a valid ISO timestamp',
        'endDate',
        params['endDate']
      );
    }
  }
}

/**
 * Validate get_session_logs tool parameters
 */
function validateGetSessionLogsParameters(params: Record<string, unknown>): void {
  if (!params['session_id'] || typeof params['session_id'] !== 'string') {
    throw new ValidationError(
      'session_id is required and must be a string',
      'session_id',
      params['session_id']
    );
  }

  validateSessionId(params['session_id'] as string);
}

/**
 * Validate search_logs tool parameters
 */
function validateSearchLogsParameters(params: Record<string, unknown>): void {
  if (!params['query'] || typeof params['query'] !== 'string') {
    throw new ValidationError('query is required and must be a string', 'query', params['query']);
  }

  const query = sanitizeInput(params['query']) as string;
  if (query.length === 0) {
    throw new ValidationError('query cannot be empty', 'query', params['query']);
  }

  validateStringLength(query, 'query', 1, DEFAULT_LIMITS.SEARCH_QUERY_MAX);

  if (params['fields'] !== undefined) {
    if (!Array.isArray(params['fields'])) {
      throw new ValidationError('fields must be an array', 'fields', params['fields']);
    }

    const validFields = ['work_content', 'successes', 'failures', 'blockers', 'thoughts'];
    for (const field of params['fields']) {
      if (typeof field !== 'string' || !validFields.includes(field)) {
        throw new ValidationError(
          `fields must contain only valid field names: ${validFields.join(', ')}`,
          'fields',
          field
        );
      }
    }
  }

  if (params['limit'] !== undefined) {
    if (
      typeof params['limit'] !== 'number' ||
      params['limit'] < 0 ||
      params['limit'] > DEFAULT_LIMITS.MAX_LIMIT_VALUE
    ) {
      throw new ValidationError(
        `limit must be a number between 0 and ${DEFAULT_LIMITS.MAX_LIMIT_VALUE}`,
        'limit',
        params['limit']
      );
    }
  }
}
