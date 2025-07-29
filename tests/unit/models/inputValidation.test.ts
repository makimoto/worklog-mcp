import { describe, it, expect } from '@jest/globals';
import {
  sanitizeInput,
  validateMCPParameters,
  validateStringLength,
  validateProjectName,
  validateSessionId,
  validateOptionalFields,
  isValidTimestamp,
  sanitizeHtml,
  escapeSpecialCharacters,
  ValidationOptions,
} from '../../../src/models/inputValidation';
import { ValidationError } from '../../../src/models/errors';

describe('Input Validation and Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should trim whitespace from strings', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('\t\ntest\t\n')).toBe('test');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
      expect(sanitizeInput(true)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should preserve internal whitespace', () => {
      expect(sanitizeInput('  hello   world  ')).toBe('hello   world');
    });
  });

  describe('validateStringLength', () => {
    it('should accept valid string lengths', () => {
      expect(() => validateStringLength('hello', 'field', 1, 10)).not.toThrow();
      expect(() => validateStringLength('test', 'field', 4, 4)).not.toThrow();
    });

    it('should reject strings that are too short', () => {
      expect(() => validateStringLength('hi', 'field', 3, 10)).toThrow(ValidationError);
      expect(() => validateStringLength('', 'field', 1, 10)).toThrow(ValidationError);
    });

    it('should reject strings that are too long', () => {
      expect(() => validateStringLength('very long string', 'field', 1, 5)).toThrow(
        ValidationError
      );
    });

    it('should include field name and constraints in error message', () => {
      try {
        validateStringLength('toolong', 'projectName', 1, 5);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('projectName');
        expect((error as ValidationError).message).toContain('5');
        expect((error as ValidationError).field).toBe('projectName');
      }
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project names', () => {
      expect(() => validateProjectName('my-project')).not.toThrow();
      expect(() => validateProjectName('project_123')).not.toThrow();
      expect(() => validateProjectName('Project-Name-2024')).not.toThrow();
    });

    it('should reject empty or whitespace-only names', () => {
      expect(() => validateProjectName('')).toThrow(ValidationError);
      expect(() => validateProjectName('   ')).toThrow(ValidationError);
    });

    it('should reject names with invalid characters', () => {
      expect(() => validateProjectName('project@name')).toThrow(ValidationError);
      expect(() => validateProjectName('project name')).toThrow(ValidationError);
      expect(() => validateProjectName('project/name')).toThrow(ValidationError);
      expect(() => validateProjectName('project\\name')).toThrow(ValidationError);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateProjectName(longName)).toThrow(ValidationError);
    });

    it('should reject names starting with special characters', () => {
      expect(() => validateProjectName('-project')).toThrow(ValidationError);
      expect(() => validateProjectName('_project')).toThrow(ValidationError);
      expect(() => validateProjectName('.project')).toThrow(ValidationError);
    });
  });

  describe('validateSessionId', () => {
    it('should accept valid session IDs', () => {
      expect(() => validateSessionId('session-123')).not.toThrow();
      expect(() => validateSessionId('claude-code-project-2024-01-01-123456')).not.toThrow();
      expect(() => validateSessionId('uuid-4a1b2c3d-e5f6-7890-abcd-ef1234567890')).not.toThrow();
    });

    it('should reject empty or whitespace-only session IDs', () => {
      expect(() => validateSessionId('')).toThrow(ValidationError);
      expect(() => validateSessionId('   ')).toThrow(ValidationError);
    });

    it('should reject session IDs with invalid characters', () => {
      expect(() => validateSessionId('session@123')).toThrow(ValidationError);
      expect(() => validateSessionId('session 123')).toThrow(ValidationError);
      expect(() => validateSessionId('session/123')).toThrow(ValidationError);
    });

    it('should reject session IDs that are too long', () => {
      const longSessionId = 'a'.repeat(256);
      expect(() => validateSessionId(longSessionId)).toThrow(ValidationError);
    });
  });

  describe('validateOptionalFields', () => {
    it('should accept valid optional fields', () => {
      const fields = {
        successes: 'Everything worked',
        failures: 'Nothing failed',
        blockers: 'No blockers',
        thoughts: 'Some thoughts',
      };
      expect(() => validateOptionalFields(fields)).not.toThrow();
    });

    it('should accept undefined fields', () => {
      const fields = {
        successes: undefined,
        failures: undefined,
        blockers: undefined,
        thoughts: undefined,
      };
      expect(() => validateOptionalFields(fields)).not.toThrow();
    });

    it('should reject fields that are too long', () => {
      const longText = 'a'.repeat(10001);
      const fields = { successes: longText };
      expect(() => validateOptionalFields(fields)).toThrow(ValidationError);
    });

    it('should reject non-string fields', () => {
      const fields = { successes: 123 as any };
      expect(() => validateOptionalFields(fields)).toThrow(ValidationError);
    });
  });

  describe('isValidTimestamp', () => {
    it('should accept valid ISO timestamps', () => {
      expect(isValidTimestamp('2024-01-01T00:00:00.000Z')).toBe(true);
      expect(isValidTimestamp('2024-12-31T23:59:59.999Z')).toBe(true);
      expect(isValidTimestamp(new Date().toISOString())).toBe(true);
    });

    it('should reject invalid timestamps', () => {
      expect(isValidTimestamp('invalid-date')).toBe(false);
      expect(isValidTimestamp('2024-13-01T00:00:00.000Z')).toBe(false);
      expect(isValidTimestamp('2024-01-32T00:00:00.000Z')).toBe(false);
      expect(isValidTimestamp('')).toBe(false);
    });

    it('should reject timestamps that are too far in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      expect(isValidTimestamp(futureDate.toISOString())).toBe(false);
    });

    it('should reject timestamps that are too far in the past', () => {
      expect(isValidTimestamp('1900-01-01T00:00:00.000Z')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeHtml('<div>Hello <b>World</b></div>')).toBe('Hello World');
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('should handle malformed HTML', () => {
      expect(sanitizeHtml('<div><span>unclosed')).toBe('unclosed');
      expect(sanitizeHtml('<<script>alert(1)</script>')).toBe('alert(1)');
    });

    it('should preserve safe text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
      expect(sanitizeHtml('No HTML here!')).toBe('No HTML here!');
    });
  });

  describe('escapeSpecialCharacters', () => {
    it('should escape SQL injection characters', () => {
      expect(escapeSpecialCharacters("'; DROP TABLE users; --")).toBe("\\'; DROP TABLE users; --");
      expect(escapeSpecialCharacters('SELECT * FROM users WHERE id = "1"')).toBe(
        'SELECT * FROM users WHERE id = \\"1\\"'
      );
    });

    it('should escape path traversal attempts', () => {
      expect(escapeSpecialCharacters('../../../etc/passwd')).toBe('..\\/..\\/..\\/etc\\/passwd');
      expect(escapeSpecialCharacters('..\\\\..\\\\..\\\\windows\\\\system32')).toBe(
        '..\\\\\\\\..\\\\\\\\..\\\\\\\\windows\\\\\\\\system32'
      );
    });

    it('should handle normal text', () => {
      expect(escapeSpecialCharacters('Normal text without special chars')).toBe(
        'Normal text without special chars'
      );
      expect(escapeSpecialCharacters('Some-normal_text.123')).toBe('Some-normal_text.123');
    });
  });

  describe('validateMCPParameters', () => {
    it('should validate create_log parameters', () => {
      const validParams = {
        project_name: 'test-project',
        work_content: 'Did some work',
        session_id: 'session-123',
      };
      expect(() => validateMCPParameters('create_log', validParams)).not.toThrow();
    });

    it('should validate create_log with new_session parameter', () => {
      const validParams = {
        project_name: 'test-project',
        work_content: 'Did some work',
        new_session: true,
      };
      expect(() => validateMCPParameters('create_log', validParams)).not.toThrow();
    });

    it('should reject create_log without required parameters', () => {
      const invalidParams = {
        project_name: 'test-project',
        // Missing work_content
      };
      expect(() => validateMCPParameters('create_log', invalidParams)).toThrow(ValidationError);
    });

    it('should validate get_logs parameters', () => {
      const validParams = {
        limit: 50,
        offset: 0,
        projectName: 'test-project',
      };
      expect(() => validateMCPParameters('get_logs', validParams)).not.toThrow();
    });

    it('should reject invalid limit values', () => {
      const invalidParams = {
        limit: -1,
      };
      expect(() => validateMCPParameters('get_logs', invalidParams)).toThrow(ValidationError);

      const tooLargeParams = {
        limit: 10000,
      };
      expect(() => validateMCPParameters('get_logs', tooLargeParams)).toThrow(ValidationError);
    });

    it('should validate search_logs parameters', () => {
      const validParams = {
        query: 'search term',
        fields: ['work_content', 'successes'],
        limit: 20,
      };
      expect(() => validateMCPParameters('search_logs', validParams)).not.toThrow();
    });

    it('should reject empty search queries', () => {
      const invalidParams = {
        query: '',
      };
      expect(() => validateMCPParameters('search_logs', invalidParams)).toThrow(ValidationError);
    });

    it('should reject unknown tools', () => {
      expect(() => validateMCPParameters('unknown_tool', {})).toThrow(ValidationError);
    });
  });

  describe('ValidationOptions', () => {
    it('should respect custom validation options', () => {
      const options: ValidationOptions = {
        maxStringLength: 5,
        allowHtml: false,
        strictMode: true,
      };

      // This should pass with default options but fail with strict length
      expect(() => validateStringLength('toolong', 'field', 1, options.maxStringLength!)).toThrow(
        ValidationError
      );
    });
  });
});
