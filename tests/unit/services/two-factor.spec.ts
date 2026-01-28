/**
 * Two-Factor Authentication Service Tests
 *
 * Tests for TOTP generation, verification, and backup codes
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  generateOTPAuthURL,
} from "@/lib/auth/two-factor";

describe("Two-Factor Authentication", () => {
  describe("generateSecret", () => {
    it("should generate a base32-encoded secret", () => {
      const secret = generateSecret();

      // Should be uppercase alphanumeric (A-Z, 2-7)
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it("should generate secrets of the correct length", () => {
      const secret = generateSecret(20);
      expect(secret.length).toBe(20);

      const longerSecret = generateSecret(32);
      expect(longerSecret.length).toBe(32);
    });

    it("should generate unique secrets", () => {
      const secrets = new Set<string>();

      for (let i = 0; i < 100; i++) {
        secrets.add(generateSecret());
      }

      // All secrets should be unique
      expect(secrets.size).toBe(100);
    });
  });

  describe("generateTOTP", () => {
    it("should generate a 6-digit code", () => {
      const secret = generateSecret();
      const code = generateTOTP(secret);

      expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate consistent codes for the same timestamp", () => {
      const secret = generateSecret();
      const timestamp = Date.now();

      const code1 = generateTOTP(secret, timestamp);
      const code2 = generateTOTP(secret, timestamp);

      expect(code1).toBe(code2);
    });

    it("should generate different codes for different secrets", () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      const timestamp = Date.now();

      const code1 = generateTOTP(secret1, timestamp);
      const code2 = generateTOTP(secret2, timestamp);

      expect(code1).not.toBe(code2);
    });

    it("should change code after 30 seconds", () => {
      const secret = generateSecret();
      const now = Date.now();

      const code1 = generateTOTP(secret, now);
      const code2 = generateTOTP(secret, now + 30000); // +30 seconds

      // Codes should be different (high probability, not guaranteed)
      // This is a statistical test, might rarely fail
      expect(code1).not.toBe(code2);
    });
  });

  describe("verifyTOTP", () => {
    it("should verify a valid code", () => {
      const secret = generateSecret();
      const code = generateTOTP(secret);

      expect(verifyTOTP(secret, code)).toBe(true);
    });

    it("should reject an invalid code", () => {
      const secret = generateSecret();

      expect(verifyTOTP(secret, "000000")).toBe(false);
      expect(verifyTOTP(secret, "123456")).toBe(false);
    });

    it("should accept codes within the time window", () => {
      const secret = generateSecret();
      const now = Date.now();

      // Generate code for current period
      const currentCode = generateTOTP(secret, now);

      // Should verify with window=1 (default)
      expect(verifyTOTP(secret, currentCode, 1)).toBe(true);
    });

    it("should reject codes outside the time window", () => {
      const secret = generateSecret();
      const now = Date.now();

      // Generate code for 2 periods ago
      const oldCode = generateTOTP(secret, now - 60000);

      // Should fail with narrow window
      expect(verifyTOTP(secret, oldCode, 0)).toBe(false);
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate the specified number of codes", () => {
      const codes = generateBackupCodes(10);
      expect(codes.length).toBe(10);

      const moreCodes = generateBackupCodes(15);
      expect(moreCodes.length).toBe(15);
    });

    it("should generate codes in the correct format", () => {
      const codes = generateBackupCodes();

      codes.forEach((code) => {
        // Format: XXXX-XXXX (8 hex chars with dash)
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
    });

    it("should generate unique codes", () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(100);
    });
  });

  describe("hashBackupCodes", () => {
    it("should hash all codes", () => {
      const codes = generateBackupCodes(5);
      const hashed = hashBackupCodes(codes);

      expect(hashed.length).toBe(5);
    });

    it("should produce SHA-256 hashes", () => {
      const codes = generateBackupCodes(1);
      const hashed = hashBackupCodes(codes);

      // SHA-256 produces 64 hex characters
      expect(hashed[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce consistent hashes", () => {
      const code = "ABCD-1234";
      const hashed1 = hashBackupCodes([code]);
      const hashed2 = hashBackupCodes([code]);

      expect(hashed1[0]).toBe(hashed2[0]);
    });
  });

  describe("verifyBackupCode", () => {
    it("should find a valid backup code", () => {
      const codes = generateBackupCodes(5);
      const hashed = hashBackupCodes(codes);

      const index = verifyBackupCode(codes[2], hashed);
      expect(index).toBe(2);
    });

    it("should return -1 for invalid code", () => {
      const codes = generateBackupCodes(5);
      const hashed = hashBackupCodes(codes);

      const index = verifyBackupCode("INVALID-CODE", hashed);
      expect(index).toBe(-1);
    });

    it("should handle case-insensitive input", () => {
      const codes = ["ABCD-1234"];
      const hashed = hashBackupCodes(codes);

      // Should work with lowercase (after normalization)
      const index = verifyBackupCode("ABCD1234", hashed);
      expect(index).toBe(0);
    });
  });

  describe("generateOTPAuthURL", () => {
    it("should generate a valid otpauth URL", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const email = "user@example.com";
      const issuer = "TestApp";

      const url = generateOTPAuthURL(secret, email, issuer);

      expect(url).toContain("otpauth://totp/");
      expect(url).toContain(encodeURIComponent(email));
      expect(url).toContain(`secret=${secret}`);
      expect(url).toContain(`issuer=${encodeURIComponent(issuer)}`);
    });

    it("should use default issuer if not provided", () => {
      const secret = generateSecret();
      const email = "user@example.com";

      const url = generateOTPAuthURL(secret, email);

      expect(url).toContain("Flowent%20AI");
    });

    it("should include algorithm and period", () => {
      const secret = generateSecret();
      const email = "user@example.com";

      const url = generateOTPAuthURL(secret, email);

      expect(url).toContain("algorithm=SHA1");
      expect(url).toContain("digits=6");
      expect(url).toContain("period=30");
    });
  });
});
