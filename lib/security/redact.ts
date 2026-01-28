// Generic PII/tokens
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g;
const TOKENS = /\b(?:pat_[A-Za-z0-9\-_]+|sk-(?:proj-)?[A-Za-z0-9\-_]{20,}|sk_(?:live|test)_[A-Za-z0-9]+|ghp_[A-Za-z0-9]+|xox[baprs]-[A-Za-z0-9\-]+|Bearer\s+[A-Za-z0-9\-_\.=]+)\b/gi;

// Cloud & DB credentials
const AWS_ACCESS_KEY_ID = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;
const AWS_SECRET_VALUE = /\baws_secret_access_key\s*[:=]\s*([A-Za-z0-9/+=]{40})\b/gi;
const GCP_API_KEY = /\bAIza[0-9A-Za-z\-_]{35}\b/g;
const AZURE_CONN_ACC_KEY = /(AccountKey=)([A-Za-z0-9+/=]{88})/g;
const AZURE_SAS_SIG = /([?&]sig=)[A-Za-z0-9%+/=]+/g;
const PG_URI = /(postgres(?:ql)?:\/\/[^:\s]+:)([^@]+)(@)/gi;
const MONGO_URI = /(mongodb(?:\+srv)?:\/\/[^:\s]+:)([^@]+)(@)/gi;

export function redact(input: string): string {
  if (!input) return input;
  let out = String(input);

  // Generic PII/tokens
  out = out.replace(EMAIL, "[REDACTED_EMAIL]");
  out = out.replace(PHONE, (m) => m.replace(/\d/g, "•"));
  out = out.replace(TOKENS, (m) => m.startsWith("Bearer") ? "Bearer [REDACTED_TOKEN]" : "[REDACTED_TOKEN]");

  // Cloud keys
  out = out.replace(AWS_ACCESS_KEY_ID, "[REDACTED_AWS_KEY_ID]");
  out = out.replace(AWS_SECRET_VALUE, (_, p1) => `aws_secret_access_key: [REDACTED_AWS_SECRET]`);
  out = out.replace(GCP_API_KEY, "[REDACTED_GCP_API_KEY]");
  out = out.replace(AZURE_CONN_ACC_KEY, "$1[REDACTED_AZURE_CONN_KEY]");
  out = out.replace(AZURE_SAS_SIG, "$1[REDACTED_AZURE_SIG]");

  // DB URIs (mask only password, preserve usability)
  out = out.replace(PG_URI, "$1***$3");
  out = out.replace(MONGO_URI, "$1***$3");

  return out;
}
