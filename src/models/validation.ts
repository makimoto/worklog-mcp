import type { CreateLogInput, LogFilters } from './types';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public providedValue?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      providedValue: this.providedValue,
    };
  }
}

/**
 * Validates input for creating a log entry
 */
export function validateCreateLogInput(input: CreateLogInput): void {
  if (!input.projectName || typeof input.projectName !== 'string') {
    throw new ValidationError(
      'Project name is required and must be a string',
      'projectName',
      input.projectName
    );
  }

  if (input.projectName.trim().length === 0) {
    throw new ValidationError('Project name cannot be empty', 'projectName', input.projectName);
  }

  if (!input.workContent || typeof input.workContent !== 'string') {
    throw new ValidationError(
      'Work content is required and must be a string',
      'workContent',
      input.workContent
    );
  }

  if (input.workContent.trim().length === 0) {
    throw new ValidationError('Work content cannot be empty', 'workContent', input.workContent);
  }

  // Validate optional string fields
  const optionalFields: Array<keyof CreateLogInput> = [
    'successes',
    'failures',
    'blockers',
    'thoughts',
  ];

  for (const field of optionalFields) {
    const value = input[field];
    if (value !== undefined && typeof value !== 'string') {
      throw new ValidationError(`${field} must be a string if provided`, field, value);
    }
  }

  // Validate session ID if provided
  if (input.sessionId !== undefined) {
    if (typeof input.sessionId !== 'string') {
      throw new ValidationError(
        'Session ID must be a string if provided',
        'sessionId',
        input.sessionId
      );
    }
  }
}

/**
 * Validates log filters
 */
export function validateLogFilters(filters: LogFilters): void {
  if (filters.limit !== undefined) {
    if (typeof filters.limit !== 'number' || filters.limit < 1 || filters.limit > 1000) {
      throw new ValidationError(
        'Limit must be a number between 1 and 1000',
        'limit',
        filters.limit
      );
    }
  }

  if (filters.offset !== undefined) {
    if (typeof filters.offset !== 'number' || filters.offset < 0) {
      throw new ValidationError('Offset must be a non-negative number', 'offset', filters.offset);
    }
  }

  if (filters.projectName !== undefined) {
    if (typeof filters.projectName !== 'string' || filters.projectName.trim().length === 0) {
      throw new ValidationError(
        'Project name must be a non-empty string if provided',
        'projectName',
        filters.projectName
      );
    }
  }

  if (filters.sessionId !== undefined) {
    if (typeof filters.sessionId !== 'string' || filters.sessionId.trim().length === 0) {
      throw new ValidationError(
        'Session ID must be a non-empty string if provided',
        'sessionId',
        filters.sessionId
      );
    }
  }

  // Validate date formats
  if (filters.startDate !== undefined) {
    if (typeof filters.startDate !== 'string') {
      throw new ValidationError(
        'Start date must be a string if provided',
        'startDate',
        filters.startDate
      );
    }
    try {
      new Date(filters.startDate).toISOString();
    } catch {
      throw new ValidationError(
        'Start date must be a valid ISO date string',
        'startDate',
        filters.startDate
      );
    }
  }

  if (filters.endDate !== undefined) {
    if (typeof filters.endDate !== 'string') {
      throw new ValidationError(
        'End date must be a string if provided',
        'endDate',
        filters.endDate
      );
    }
    try {
      new Date(filters.endDate).toISOString();
    } catch {
      throw new ValidationError(
        'End date must be a valid ISO date string',
        'endDate',
        filters.endDate
      );
    }
  }
}

/**
 * Validates search query
 */
export function validateSearchQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new ValidationError('Search query is required and must be a string', 'query', query);
  }

  if (query.trim().length === 0) {
    throw new ValidationError('Search query cannot be empty', 'query', query);
  }

  if (query.length > 500) {
    throw new ValidationError('Search query cannot exceed 500 characters', 'query', query);
  }
}
