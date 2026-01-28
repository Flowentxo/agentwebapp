import { describe, it, expect } from 'vitest';
import { redact } from '@/lib/security/redact';

describe('redact()', () => {
  it('masks emails, phones, and tokens', () => {
    const s = [
      'alice+dev@example.com',
      '+1 (415) 555-2671',
      'pat_ABC-123_def',
      'Bearer flwnt_test_12345',
    ].join('\n');

    const out = redact(s);
    expect(out).not.toContain('alice+dev@example.com');
    expect(out).not.toContain('555-2671');
    expect(out).not.toContain('pat_ABC-123_def');
    expect(out).toContain('[REDACTED_EMAIL]');
    expect(out).toContain('[REDACTED_TOKEN]');
    expect(out).toContain('Bearer [REDACTED_TOKEN]');
  });

  it('masks cloud creds and DB URIs', () => {
    const s = [
      'AKIAIOSFODNN7EXAMPLE',
      'aws_secret_access_key=abcdEFGHijklMNOPqrstUVWXyz0123456789+/==',
      'AIzaSyA1234567890abcdefGhIJkLmNopQrstu',
      'DefaultEndpointsProtocol=https;AccountName=foo;AccountKey=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=;EndpointSuffix=core.windows.net',
      'https://x.blob.core.windows.net/c?sv=2021-08-06&sig=wHeN3VrY%2BabcDEF%3D',
      'postgres://user:superSecretP@ss@db.example.com:5432/app',
      'mongodb+srv://user:myS3cret!@cluster0.mongodb.net/app',
    ].join('\n');

    const out = redact(s);
    expect(out).toContain('[REDACTED_AWS_KEY_ID]');
    expect(out).toContain('[REDACTED_AWS_SECRET]');
    expect(out).toContain('[REDACTED_GCP_API_KEY]');
    expect(out).toContain('AccountKey=[REDACTED_AZURE_CONN_KEY]');
    expect(out).toContain('sig=[REDACTED_AZURE_SIG]');
    expect(out).toContain('postgres://user:***@');
    expect(out).toContain('mongodb+srv://user:***@');

    // No raw leaks
    expect(out).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(out).not.toContain('aws_secret_access_key=');
    expect(out).not.toContain('AIzaSyA1234');
    expect(out).not.toContain('superSecretP@ss');
    expect(out).not.toContain('myS3cret!');
  });
});
