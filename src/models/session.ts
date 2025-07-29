import { randomUUID } from 'crypto';

/**
 * Session manager interface
 */
export interface SessionManager {
  generateSessionId(): string;
  validateSessionId(sessionId: string): boolean;
  getOrCreateSession(sessionId?: string): string;
}

/**
 * Validates if a session ID meets the requirements
 */
export function isValidSessionId(sessionId: string): boolean {
  // Length check: 1-128 characters
  if (sessionId.length < 1 || sessionId.length > 128) {
    return false;
  }

  // Character check: alphanumeric, hyphens, underscores, dots
  return /^[a-zA-Z0-9._-]+$/.test(sessionId);
}

/**
 * Default implementation of SessionManager
 */
export class DefaultSessionManager implements SessionManager {
  /**
   * Generates a new UUID v4 session ID
   */
  generateSessionId(): string {
    return randomUUID();
  }

  /**
   * Validates a session ID format
   */
  validateSessionId(sessionId: string): boolean {
    return isValidSessionId(sessionId);
  }

  /**
   * Gets existing session ID or creates a new one
   */
  getOrCreateSession(sessionId?: string): string {
    if (sessionId) {
      if (!this.validateSessionId(sessionId)) {
        throw new Error(`Invalid session ID format: ${sessionId}`);
      }
      return sessionId;
    }

    return this.generateSessionId();
  }
}
