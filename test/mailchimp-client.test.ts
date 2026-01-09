import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractServerFromApiKey } from '../src/mailchimp-client.js';

vi.mock('@mailchimp/mailchimp_marketing', () => ({
  default: {
    setConfig: vi.fn(),
    lists: {},
  },
}));

describe('mailchimp-client', () => {
  describe('extractServerFromApiKey', () => {
    it('should extract server from valid API key', () => {
      const apiKey = 'abc123-us10';
      const server = extractServerFromApiKey(apiKey);
      expect(server).toBe('us10');
    });

    it('should extract server from different data center', () => {
      const apiKey = 'xyz789-us21';
      const server = extractServerFromApiKey(apiKey);
      expect(server).toBe('us21');
    });

    it('should throw error for invalid API key format', () => {
      const invalidKey = 'invalid-key-format-here';
      expect(() => extractServerFromApiKey(invalidKey)).toThrow(
        'Invalid API key format. Expected format: key-server'
      );
    });

    it('should throw error for API key without dash', () => {
      const invalidKey = 'nodashhere';
      expect(() => extractServerFromApiKey(invalidKey)).toThrow(
        'Invalid API key format. Expected format: key-server'
      );
    });

    it('should throw error for empty API key', () => {
      const invalidKey = '';
      expect(() => extractServerFromApiKey(invalidKey)).toThrow(
        'Invalid API key format. Expected format: key-server'
      );
    });
  });
});
