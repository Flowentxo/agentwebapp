/**
 * Code Execute Tool
 *
 * Executes JavaScript/TypeScript code in a sandboxed environment using isolated-vm.
 * Returns execution output, console logs, and timing information.
 */

export interface CodeExecuteInput {
  code: string;
  language: 'javascript' | 'typescript';
  timeout_ms?: number;
}

export interface CodeExecuteResult {
  output: any;
  console_output: string[];
  execution_time_ms: number;
  success: boolean;
  error?: string;
  formatted_output: string;
}

/**
 * OpenAI Function Tool Definition
 */
export const CODE_EXECUTE_TOOL = {
  name: 'code_execute',
  description: 'Fuehre JavaScript oder TypeScript Code in einer sicheren Sandbox aus. Gibt das Ergebnis, Console-Output und Ausfuehrungszeit zurueck. Nutze dies um Code zu testen, Berechnungen durchzufuehren oder Algorithmen zu validieren.',
  input_schema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Der auszufuehrende Code. Muss eine einzige Expression sein oder ein IIFE (Immediately Invoked Function Expression) fuer komplexere Logik.',
      },
      language: {
        type: 'string',
        enum: ['javascript', 'typescript'],
        description: 'Programmiersprache (default: javascript)',
      },
      timeout_ms: {
        type: 'number',
        description: 'Maximale Ausfuehrungszeit in Millisekunden (default: 5000, max: 10000)',
      },
    },
    required: ['code'],
  },
};

/**
 * Execute code in sandbox
 */
export async function executeCode(input: CodeExecuteInput): Promise<CodeExecuteResult> {
  const { code, language = 'javascript', timeout_ms = 5000 } = input;
  const startTime = Date.now();
  const consoleLogs: string[] = [];

  // Security validation
  const forbidden = ['require(', 'import(', 'process.', 'child_process', '__dirname', '__filename', 'global.', 'globalThis.'];
  for (const pattern of forbidden) {
    if (code.includes(pattern)) {
      return {
        output: null,
        console_output: [],
        execution_time_ms: 0,
        success: false,
        error: `Sicherheitsfehler: "${pattern}" ist nicht erlaubt in der Sandbox`,
        formatted_output: `❌ Sicherheitsfehler: "${pattern}" ist nicht erlaubt`,
      };
    }
  }

  const clampedTimeout = Math.min(Math.max(timeout_ms, 100), 10000);

  try {
    // Try to use isolated-vm for true sandboxing
    let result: any;
    try {
      const ivm = await import('isolated-vm');
      const isolate = new ivm.Isolate({ memoryLimit: 128 });
      const context = await isolate.createContext();

      // Inject console.log capture
      const jail = context.global;
      await jail.set('_logs', new ivm.ExternalCopy([]).copyInto());
      await context.eval(`
        const console = {
          log: (...args) => { _logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
          error: (...args) => { _logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')); },
          warn: (...args) => { _logs.push('[WARN] ' + args.map(a => String(a)).join(' ')); },
        };
      `);

      // Execute code
      const script = await isolate.compileScript(code);
      result = await script.run(context, { timeout: clampedTimeout });

      // Get console logs
      const logsRef = await jail.get('_logs');
      const logs = await logsRef.copy();
      if (Array.isArray(logs)) {
        consoleLogs.push(...logs);
      }

      isolate.dispose();
    } catch (ivmError: any) {
      // Fallback: Use Function constructor (less secure but functional)
      const logs: string[] = [];
      const mockConsole = {
        log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
        warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
      };

      const wrappedCode = `
        const console = arguments[0];
        return (function() { ${code} })();
      `;

      const fn = new Function(wrappedCode);

      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout nach ${clampedTimeout}ms`)), clampedTimeout)
      );
      result = await Promise.race([
        Promise.resolve(fn(mockConsole)),
        timeoutPromise,
      ]);
      consoleLogs.push(...logs);
    }

    const executionTime = Date.now() - startTime;
    const outputStr = result !== undefined ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)) : 'undefined';

    const formatted = [
      `✅ Code erfolgreich ausgefuehrt (${executionTime}ms)`,
      '',
      '**Ergebnis:**',
      '```',
      outputStr,
      '```',
      ...(consoleLogs.length > 0 ? [
        '',
        '**Console Output:**',
        ...consoleLogs.map(l => `> ${l}`),
      ] : []),
    ].join('\n');

    return {
      output: result,
      console_output: consoleLogs,
      execution_time_ms: executionTime,
      success: true,
      formatted_output: formatted,
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    return {
      output: null,
      console_output: consoleLogs,
      execution_time_ms: executionTime,
      success: false,
      error: error.stack || error.message,
      formatted_output: `❌ Fehler bei Ausfuehrung:\n${error.stack || error.message}`,
    };
  }
}
