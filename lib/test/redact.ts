// Conservative regexes; tweak to match your prod redaction if needed.
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// Common phone formats (E.164-ish + loose)
const PHONE = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g;
// Tokens (examples: pat_, flwnt_live_, ghp_, xoxb-, Bearer ...)
const TOKENS = /\b(?:pat_[A-Za-z0-9\-_]+|sk_(?:live|test)_[A-Za-z0-9]+|ghp_[A-Za-z0-9]+|xox[bap]-[A-Za-z0-9\-]+|Bearer\s+[A-Za-z0-9\-_\.=]+)\b/gi;

export function redact(input: string): string {
  if (!input) return input;
  let out = input;
  out = out.replace(EMAIL, "[REDACTED_EMAIL]");
  out = out.replace(PHONE, (m) => (m.replace(/\d/g, "•"))); // digit-only mask preserves shape
  out = out.replace(TOKENS, "[REDACTED_TOKEN]");
  return out;
}
