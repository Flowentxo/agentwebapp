// Keep test envs deterministic
// Note: NODE_ENV is automatically set to 'test' by vitest
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Soft polyfills or globals can go here if needed later.
