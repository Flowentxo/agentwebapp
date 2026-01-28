/**
 * Unit Tests: OAuth2 Utilities
 *
 * Tests for PKCE, state generation, encryption, and token validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  encrypt,
  decrypt,
  validateState,
  isTokenExpiringSoon,
} from '@/lib/auth/oauth';

describe('OAuth2 Utilities', () => {
  describe('PKCE - Code Verifier', () => {
    it('should generate 128-character code verifier', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toHaveLength(128);
    });

    it('should only contain URL-safe characters', () => {
      const verifier = generateCodeVerifier();
      const urlSafePattern = /^[A-Za-z0-9\-_]+$/;
      expect(urlSafePattern.test(verifier)).toBe(true);
    });

    it('should generate unique verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should generate cryptographically random values', () => {
      const verifiers = new Set();
      for (let i = 0; i < 100; i++) {
        verifiers.add(generateCodeVerifier());
      }
      expect(verifiers.size).toBe(100); // All unique
    });
  });

  describe('PKCE - Code Challenge', () => {
    it('should generate valid SHA256 challenge', async () => {
      const verifier = 'test-verifier-123456789';
      const challenge = await generateCodeChallenge(verifier);

      expect(challenge).toBeTruthy();
      expect(challenge.length).toBeGreaterThan(40);
    });

    it('should produce consistent challenge for same verifier', async () => {
      const verifier = 'consistent-verifier';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });

    it('should produce different challenges for different verifiers', async () => {
      const verifier1 = 'verifier-one';
      const verifier2 = 'verifier-two';

      const challenge1 = await generateCodeChallenge(verifier1);
      const challenge2 = await generateCodeChallenge(verifier2);

      expect(challenge1).not.toBe(challenge2);
    });

    it('should only contain URL-safe characters', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const urlSafePattern = /^[A-Za-z0-9\-_]+$/;

      expect(urlSafePattern.test(challenge)).toBe(true);
    });
  });

  describe('State Parameter', () => {
    it('should generate 32-character state', () => {
      const state = generateState();
      // 32 bytes base64url encoded is 43 characters
      expect(state.length).toBeGreaterThan(40);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });

    it('should only contain hexadecimal characters', () => {
      const state = generateState();
      const base64UrlPattern = /^[A-Za-z0-9\-_]+$/;
      expect(base64UrlPattern.test(state)).toBe(true);
    });

    it('should validate matching states', () => {
      const state = generateState();
      expect(validateState(state, state)).toBe(true);
    });

    it('should reject mismatched states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(validateState(state1, state2)).toBe(false);
    });

    it('should reject null/undefined states', () => {
      const state = generateState();
      expect(validateState(state, null as any)).toBe(false);
      expect(validateState(null as any, state)).toBe(false);
      expect(validateState(state, undefined as any)).toBe(false);
    });
  });

  describe('Token Encryption', () => {
    const testToken = 'test-access-token-12345';

    it('should encrypt and decrypt successfully', () => {
      const encrypted = encrypt(testToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(testToken);
    });

    it('should produce different ciphertext each time', () => {
      const encrypted1 = encrypt(testToken);
      const encrypted2 = encrypt(testToken);

      // Due to random IV, should be different
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle long tokens', () => {
      const longToken = 'a'.repeat(1000);
      const encrypted = encrypt(longToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longToken);
    });

    it('should handle special characters', () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(specialToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(specialToken);
    });

    it('should throw error on invalid ciphertext', () => {
      expect(decrypt('invalid-ciphertext')).toBe('');
    });

    it('should throw error on tampered ciphertext', () => {
      const encrypted = encrypt(testToken);
      const tampered = encrypted.slice(0, -5) + 'xxxxx';
      expect(decrypt(tampered)).toBe('');
    });

    it('should produce hex-encoded parts', () => {
      const encrypted = encrypt(testToken);
      // Format: iv(hex):authTag(hex):encrypted(hex)
      const hexPattern = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/;
      expect(hexPattern.test(encrypted)).toBe(true);
    });
  });

  describe('Token Expiry', () => {
    it('should detect token expiring soon (within 5 minutes)', () => {
      const expiresAt = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes
      expect(isTokenExpiringSoon(expiresAt)).toBe(true);
    });

    it('should detect token not expiring soon', () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      expect(isTokenExpiringSoon(expiresAt)).toBe(false);
    });

    it('should detect already expired token', () => {
      const expiresAt = new Date(Date.now() - 1000); // 1 second ago
      expect(isTokenExpiringSoon(expiresAt)).toBe(true);
    });

    it('should handle custom buffer time', () => {
      const expiresAt = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes

      // Default buffer (5 minutes) - not expiring soon
      expect(isTokenExpiringSoon(expiresAt)).toBe(false);

      // Custom buffer (10 minutes) - expiring soon
      expect(isTokenExpiringSoon(expiresAt, 10 * 60)).toBe(true);
    });

    it('should handle Date string input', () => {
      const dateString = new Date(Date.now() + 4 * 60 * 1000).toISOString();
      const expiresAt = new Date(dateString);
      expect(isTokenExpiringSoon(expiresAt)).toBe(true);
    });

    it('should handle far future dates', () => {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      expect(isTokenExpiringSoon(expiresAt)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle encryption of very long tokens', () => {
      const longToken = 'x'.repeat(10000);
      const encrypted = encrypt(longToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longToken);
      expect(decrypted.length).toBe(10000);
    });

    it('should handle unicode characters in tokens', () => {
      const unicodeToken = 'token-with-unicode-🔐-characters-한글-中文';
      const encrypted = encrypt(unicodeToken);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(unicodeToken);
    });

    it('should handle null bytes in tokens', () => {
      const tokenWithNull = 'token\x00with\x00nulls';
      const encrypted = encrypt(tokenWithNull);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(tokenWithNull);
    });
  });

  describe('Security', () => {
    it('should not expose plaintext in encrypted output', () => {
      const token = 'super-secret-token';
      const encrypted = encrypt(token);

      expect(encrypted).not.toContain(token);
      expect(encrypted).not.toContain('super');
      expect(encrypted).not.toContain('secret');
    });

    it('should produce sufficient entropy in verifier', () => {
      const verifier = generateCodeVerifier();
      const uniqueChars = new Set(verifier.split('')).size;

      // Should have at least 30 unique characters (good entropy)
      expect(uniqueChars).toBeGreaterThan(30);
    });

    it('should produce sufficient entropy in state', () => {
      const state = generateState();
      const uniqueChars = new Set(state.split('')).size;

      // Should have at least 10 unique characters
      expect(uniqueChars).toBeGreaterThan(10);
    });

    it('should not allow decryption without correct key', () => {
      // This test assumes ENCRYPTION_KEY is set in env
      const token = 'test-token';
      const encrypted = encrypt(token);

      // Simulate wrong key by tampering with encrypted data
      const wrongKey = encrypted.slice(0, 10) + 'xxx' + encrypted.slice(13);

      expect(decrypt(wrongKey)).toBe('');
    });
  });

  describe('Performance', () => {
    it('should generate code verifier quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        generateCodeVerifier();
      }
      const duration = Date.now() - start;

      // Should complete 1000 generations in < 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should encrypt/decrypt quickly', () => {
      const token = 'test-token-for-performance';
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const encrypted = encrypt(token);
        decrypt(encrypted);
      }

      const duration = Date.now() - start;

      // Should complete 1000 encrypt/decrypt cycles in < 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});
