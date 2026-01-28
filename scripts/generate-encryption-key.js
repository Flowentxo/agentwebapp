#!/usr/bin/env node

/**
 * Generate Encryption Key for OAuth2 Integration
 *
 * Usage: node scripts/generate-encryption-key.js
 */

const crypto = require('crypto');

console.log('\n===========================================');
console.log('🔐 OAuth2 Encryption Key Generator');
console.log('===========================================\n');

// Generate 32 bytes (256 bits) for AES-256
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('Your encryption key (64 characters):');
console.log('─────────────────────────────────────────');
console.log(encryptionKey);
console.log('─────────────────────────────────────────\n');

console.log('Add this to your .env.local file:');
console.log(`ENCRYPTION_KEY=${encryptionKey}\n`);

console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Keep this key SECRET - never commit to Git');
console.log('2. Use the same key across all environments for data consistency');
console.log('3. If you change the key, all existing tokens must be re-authenticated');
console.log('4. Store backups securely (password manager, vault, etc.)');
console.log('5. Use different keys for dev/staging/production\n');

console.log('===========================================\n');
