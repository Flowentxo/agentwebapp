# Security Hardening Implementation

## WorkflowExecutionEngineV2 - RCE & Injection Prevention

**Date**: January 2026
**Status**: Implemented
**Risk Level**: Previously CRITICAL, now MITIGATED

---

## Executive Summary

This document describes the security hardening implemented for the Flowent Pipeline System's workflow execution engine. The primary vulnerability was **Remote Code Execution (RCE)** via the `DataTransformExecutorV2` which used `new Function()` to execute user-provided JavaScript code without any sandboxing.

### Key Changes
1. **SecureSandboxService** - Isolated JavaScript execution using `isolated-vm`
2. **SafePathResolver** - Prototype pollution prevention for variable resolution
3. **Hardened DataTransformExecutorV2** - Secure code execution with pre-analysis
4. **Updated VariableService** - Protected against prototype pollution attacks

---

## Vulnerability Analysis

### Previous Vulnerable Code

```typescript
// VULNERABLE: server/services/WorkflowExecutionEngineV2.ts
class DataTransformExecutorV2 implements INodeExecutor {
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { transformCode, expression } = input.node.data;
    const code = transformCode || expression;

    // CRITICAL: new Function() can access global scope
    const transformFn = new Function(
      'input',
      'state',
      'variables',
      `return ${code}`
    );

    // User could execute: process.exit(1), require('fs').unlinkSync('/'), etc.
    const result = transformFn(input.inputs, input.context.state, variables);
  }
}
```

### Attack Vectors Blocked

1. **RCE via process access**: `process.exit(1)`, `process.env.SECRET_KEY`
2. **RCE via require**: `require('child_process').execSync('rm -rf /')`
3. **Prototype pollution**: `{{constructor.constructor('return process')()}}`
4. **Global access**: `globalThis.require`, `global.process`
5. **File system access**: `require('fs').readFileSync('/etc/passwd')`

---

## Implementation Details

### 1. SecureSandboxService

**Location**: `server/services/security/SecureSandboxService.ts`

Uses `isolated-vm` to create a completely isolated V8 context:

```typescript
import * as ivm from 'isolated-vm';

export class SecureSandboxService {
  async execute(code: string, context: Record<string, any>): Promise<SandboxExecutionResult> {
    // Create isolated V8 instance with memory limit
    const isolate = new ivm.Isolate({ memoryLimit: 128 }); // 128MB

    // Create new context with NO global access
    const contextObj = await isolate.createContext();

    // Execute with timeout
    const result = await script.run(contextObj, {
      timeout: 1000, // 1 second max
      copy: true,
    });
  }
}
```

**Security Features**:
- Isolated V8 context (no access to Node.js globals)
- 1000ms execution timeout
- 128MB memory limit
- Pre-execution code analysis for dangerous patterns
- Safe input/output marshalling
- Security audit logging

### 2. SafePathResolver

**Location**: `server/services/security/SafePathResolver.ts`

Prevents prototype pollution in variable resolution:

```typescript
const FORBIDDEN_PATH_SEGMENTS = [
  '__proto__',
  'prototype',
  'constructor',
  // ... more
];

export function safeGetValueByPath(obj: any, path: string): SafePathResult {
  // Validate path for dangerous segments
  const validation = validatePath(path);
  if (!validation.valid) {
    return {
      value: undefined,
      blocked: true,
      blockedSegment: validation.dangerousSegments[0],
    };
  }

  // Only access own properties, not inherited ones
  if (!Object.prototype.hasOwnProperty.call(current, segment)) {
    return { value: undefined, found: false, blocked: false };
  }
}
```

### 3. Hardened DataTransformExecutorV2

**Location**: `server/services/executors/DataTransformExecutorV2.ts`

Wraps SecureSandboxService for workflow execution:

```typescript
export class DataTransformExecutorV2 implements INodeExecutor {
  private sandbox: SecureSandboxService;

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    // Pre-validate code
    const validation = this.validateCode(code);
    if (!validation.canExecute) {
      return { success: false, error: 'Security violation' };
    }

    // Execute in secure sandbox
    const result = await this.sandbox.execute(code, sandboxContext, {
      timeoutMs: 1000,
      memoryLimitMb: 128,
    });
  }
}
```

### 4. Updated VariableService

**Location**: `server/services/VariableService.ts`

Now uses SafePathResolver:

```typescript
import { safeGetValueByPath, isForbiddenSegment } from './security/SafePathResolver';

export function getValueByPath(obj: any, path: string): any {
  const result = safeGetValueByPath(obj, path);

  if (result.blocked) {
    logger.warn('Blocked prototype pollution attempt', { path });
  }

  return result.value;
}

export function resolveVariables(input: any, state: ExecutionState): any {
  // SECURITY: Validate path before resolution
  if (!isPathSafe(path)) {
    logger.warn('Blocked unsafe variable path', { path });
    return undefined;
  }

  // SECURITY: Skip forbidden keys
  if (isForbiddenSegment(key)) {
    continue;
  }
}
```

---

## Dangerous Patterns Blocked

The security system detects and blocks these patterns before execution:

| Pattern | Type | Severity |
|---------|------|----------|
| `process` | Process Access | CRITICAL |
| `require()` | Module Import | CRITICAL |
| `import()` | Dynamic Import | CRITICAL |
| `eval()` | Code Execution | CRITICAL |
| `Function()` | Code Execution | CRITICAL |
| `constructor.constructor` | Prototype Pollution | CRITICAL |
| `__proto__` | Prototype Pollution | CRITICAL |
| `global` / `globalThis` | Global Access | CRITICAL |
| `fs.read/write` | File System | CRITICAL |
| `child_process` | Shell Execution | CRITICAL |
| `Buffer` | Memory Access | MEDIUM |
| `setTimeout/setInterval` | Async Escape | MEDIUM |

---

## Files Modified/Created

### Created
- `server/services/security/types.ts` - Security type definitions
- `server/services/security/SecureSandboxService.ts` - Sandbox execution
- `server/services/security/SafePathResolver.ts` - Path resolution
- `server/services/security/index.ts` - Module exports
- `server/services/executors/DataTransformExecutorV2.ts` - Hardened executor

### Modified
- `server/services/WorkflowExecutionEngineV2.ts` - Uses secure executor
- `server/services/VariableService.ts` - Uses SafePathResolver

---

## Security Audit Logging

All sandbox executions are logged with:

```typescript
interface SecurityAuditLogEntry {
  timestamp: Date;
  eventType: 'sandbox_execution' | 'security_violation' | 'code_analysis';
  userId?: string;
  workflowId?: string;
  nodeId?: string;
  code?: string;        // Sanitized/truncated
  result: 'success' | 'blocked' | 'failed';
  violations: SecurityViolation[];
  executionTimeMs?: number;
}
```

Access audit logs via:
```typescript
const executor = getDataTransformExecutor();
const logs = executor.getAuditLog(100);
const stats = executor.getSecurityStats();
```

---

## Testing Recommendations

1. **RCE Prevention Test**:
   ```javascript
   // Should be BLOCKED
   process.exit(1)
   require('fs').unlinkSync('/tmp/test')
   global.process.env.SECRET
   ```

2. **Prototype Pollution Test**:
   ```javascript
   // Should return undefined, not execute
   {{constructor.constructor('return process')()}}
   {{__proto__.polluted}}
   ```

3. **Timeout Test**:
   ```javascript
   // Should timeout after 1000ms
   while(true) {}
   ```

4. **Memory Limit Test**:
   ```javascript
   // Should fail with memory limit error
   let a = []; while(true) a.push(new Array(1000000))
   ```

---

## Dependencies Added

```json
{
  "dependencies": {
    "isolated-vm": "^5.0.0"
  }
}
```

**Note**: `isolated-vm` requires native compilation and may need additional setup in containerized environments.

---

## Residual Risk

1. **DoS via Complexity**: Complex but valid code could still cause high CPU usage within timeout
2. **Memory Spikes**: Large data transformations could spike memory before hitting limits
3. **Side Channels**: Timing attacks possible but low risk in this context

**Mitigation**: Rate limiting on workflow executions recommended for production.
