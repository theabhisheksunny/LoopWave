import { describe, it, expect } from 'vitest';
import {
  isPrivateIp,
  sanitizeUrlForLogging,
  isSafeExternalUrl
} from '../../src/main/security';

describe('Security module', () => {
  describe('isPrivateIp (SSRF Protection)', () => {
    it('detects localhost and loopback IPv4', () => {
      expect(isPrivateIp('localhost')).toBe(true);
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.10.0.1')).toBe(true);
    });

    it('detects private RFC 1918 subnets', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.254.254')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
    });

    it('detects link-local addresses (169.254.0.0/16)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('detects IPv6 loopback and unique local addresses', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('allows valid public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('142.250.190.46')).toBe(false);
    });
  });

  describe('sanitizeUrlForLogging', () => {
    it('redacts sensitive query parameters like token, key, secret, auth', () => {
      const url = 'https://example.com/media.mp4?token=secret123&key=xyz456&title=MyVideo';
      const sanitized = sanitizeUrlForLogging(url);

      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('xyz456');
      expect(sanitized).toContain('token=%5BREDACTED%5D');
      expect(sanitized).toContain('title=MyVideo');
    });

    it('handles malformed URLs safely', () => {
      const res = sanitizeUrlForLogging('not-a-valid-url');
      expect(res).toBe('[MALFORMED_URL]');
    });
  });

  describe('isSafeExternalUrl', () => {
    it('accepts valid public https and http URLs', () => {
      expect(isSafeExternalUrl('https://youtube.com')).toBe(true);
      expect(isSafeExternalUrl('http://example.com/video.mp4')).toBe(true);
    });

    it('rejects unsafe protocols like file:, javascript:, data:', () => {
      expect(isSafeExternalUrl('file:///C:/Windows/System32')).toBe(false);
      expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeExternalUrl('data:text/html,<h1>Hello</h1>')).toBe(false);
    });

    it('rejects loopback and private destination URLs', () => {
      expect(isSafeExternalUrl('http://localhost:8080')).toBe(false);
      expect(isSafeExternalUrl('http://127.0.0.1:3000')).toBe(false);
      expect(isSafeExternalUrl('http://192.168.1.1/admin')).toBe(false);
    });
  });
});
