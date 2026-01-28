/**
 * LoggingService Unit Tests
 *
 * Tests for the enterprise structured logging system
 */

import {
  LoggingService,
  logger,
  agentLogger,
  toolLogger,
  aiLogger,
  DEFAULT_LOGGING_CONFIG,
  LogLevel,
  LogEntry,
  LogContext,
} from '../LoggingService';

describe('LoggingService', () => {
  let testLogger: ReturnType<typeof logger.createLogger>;
  let logEntries: LogEntry[] = [];

  beforeAll(() => {
    // Capture log output for testing
    logger.on('log', (entry: LogEntry) => {
      logEntries.push(entry);
    });
  });

  beforeEach(() => {
    logEntries = [];
    testLogger = logger.createLogger({
      service: 'test-service',
      component: 'test-component',
    });
  });

  afterEach(() => {
    logger.flush();
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      testLogger.info('Test info message');
      logger.flush();

      expect(logEntries.length).toBeGreaterThan(0);
      const entry = logEntries.find((e) => e.message === 'Test info message');
      expect(entry).toBeDefined();
      expect(entry?.level).toBe('INFO');
    });

    it('should log debug messages', () => {
      logger.configure({ minLevel: 'DEBUG' });
      testLogger.debug('Test debug message');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Test debug message');
      expect(entry).toBeDefined();
      expect(entry?.level).toBe('DEBUG');
    });

    it('should log warn messages', () => {
      testLogger.warn('Test warning message');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Test warning message');
      expect(entry).toBeDefined();
      expect(entry?.level).toBe('WARN');
    });

    it('should log error messages with error object', () => {
      const testError = new Error('Test error');
      testLogger.error('Test error message', testError);
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Test error message');
      expect(entry).toBeDefined();
      expect(entry?.level).toBe('ERROR');
      expect(entry?.error).toBeDefined();
      expect(entry?.error?.message).toBe('Test error');
    });

    it('should log fatal messages', () => {
      const testError = new Error('Fatal error');
      testLogger.fatal('Test fatal message', testError);
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Test fatal message');
      expect(entry).toBeDefined();
      expect(entry?.level).toBe('FATAL');
    });
  });

  describe('Context Management', () => {
    it('should include context in log entries', () => {
      testLogger.info('Message with context');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Message with context');
      expect(entry?.context.service).toBe('test-service');
      expect(entry?.context.component).toBe('test-component');
    });

    it('should support child loggers with additional context', () => {
      const childLogger = testLogger.child({
        agentId: 'test-agent',
        userId: 'user-123',
      });

      childLogger.info('Child logger message');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Child logger message');
      expect(entry?.context.service).toBe('test-service');
      expect(entry?.context.agentId).toBe('test-agent');
      expect(entry?.context.userId).toBe('user-123');
    });

    it('should merge context from nested child loggers', () => {
      const childLogger = testLogger.child({ agentId: 'agent-1' });
      const grandchildLogger = childLogger.child({ toolId: 'tool-1' });

      grandchildLogger.info('Grandchild message');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Grandchild message');
      expect(entry?.context.service).toBe('test-service');
      expect(entry?.context.agentId).toBe('agent-1');
      expect(entry?.context.toolId).toBe('tool-1');
    });
  });

  describe('Data Logging', () => {
    it('should include additional data in log entries', () => {
      testLogger.info('Message with data', { foo: 'bar', count: 42 });
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Message with data');
      expect(entry?.data).toEqual({ foo: 'bar', count: 42 });
    });

    it('should handle complex data structures', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
        date: new Date().toISOString(),
      };

      testLogger.info('Complex data', complexData);
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Complex data');
      expect(entry?.data).toBeDefined();
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask password fields', () => {
      testLogger.info('Login attempt', { username: 'user', password: 'secret123' });
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Login attempt');
      expect((entry?.data as any)?.password).toBe('***MASKED***');
      expect((entry?.data as any)?.username).toBe('user');
    });

    it('should mask API key fields', () => {
      testLogger.info('API call', { apiKey: 'sk-abc123', endpoint: '/users' });
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'API call');
      expect((entry?.data as any)?.apiKey).toBe('***MASKED***');
      expect((entry?.data as any)?.endpoint).toBe('/users');
    });

    it('should mask token fields in context', () => {
      const loggerWithToken = logger.createLogger({
        service: 'auth',
        token: 'bearer-xyz789',
      });

      loggerWithToken.info('Auth check');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Auth check');
      expect((entry?.context as any)?.token).toBe('***MASKED***');
    });

    it('should mask nested sensitive fields', () => {
      testLogger.info('Nested data', {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      });
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Nested data');
      const data = entry?.data as any;
      expect(data?.user?.credentials?.password).toBe('***MASKED***');
      expect(data?.user?.credentials?.apiKey).toBe('***MASKED***');
      expect(data?.user?.name).toBe('John');
    });
  });

  describe('Timer Functionality', () => {
    it('should measure operation duration', async () => {
      const endTimer = testLogger.startTimer('slow-operation');

      // Simulate slow operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      endTimer();
      logger.flush();

      const entry = logEntries.find(
        (e) => e.message.includes('slow-operation') && e.message.includes('completed')
      );
      expect(entry).toBeDefined();
      expect((entry?.data as any)?.duration).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Log Level Filtering', () => {
    it('should filter out logs below minimum level', () => {
      logger.configure({ minLevel: 'WARN' });

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      logger.flush();

      const debugEntry = logEntries.find((e) => e.message === 'Debug message');
      const infoEntry = logEntries.find((e) => e.message === 'Info message');
      const warnEntry = logEntries.find((e) => e.message === 'Warn message');

      expect(debugEntry).toBeUndefined();
      expect(infoEntry).toBeUndefined();
      expect(warnEntry).toBeDefined();

      // Reset
      logger.configure({ minLevel: 'INFO' });
    });
  });

  describe('Metadata Enrichment', () => {
    it('should include metadata in log entries', () => {
      testLogger.info('Metadata test');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Metadata test');
      expect(entry?.metadata).toBeDefined();
      expect(entry?.metadata.environment).toBeDefined();
      expect(entry?.metadata.version).toBeDefined();
    });

    it('should include timestamp in ISO format', () => {
      testLogger.info('Timestamp test');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Timestamp test');
      expect(entry?.timestamp).toBeDefined();
      expect(() => new Date(entry!.timestamp)).not.toThrow();
    });
  });

  describe('Pre-configured Loggers', () => {
    it('should have agent logger configured', () => {
      agentLogger.info('Agent log');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Agent log');
      expect(entry?.context.component).toBe('agent');
    });

    it('should have tool logger configured', () => {
      toolLogger.info('Tool log');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'Tool log');
      expect(entry?.context.component).toBe('tool');
    });

    it('should have AI logger configured', () => {
      aiLogger.info('AI log');
      logger.flush();

      const entry = logEntries.find((e) => e.message === 'AI log');
      expect(entry?.context.component).toBe('ai');
    });
  });

  describe('Agent-Specific Logging', () => {
    it('should log agent activity', () => {
      logger.logAgentActivity('alfred', 'Task started', { userId: 'user-123' }, { taskId: 'task-1' });
      logger.flush();

      const entry = logEntries.find((e) => e.message.includes('ALFRED'));
      expect(entry).toBeDefined();
      expect(entry?.context.agentId).toBe('alfred');
    });

    it('should log tool execution', () => {
      logger.logToolExecution('suki', 'generate-content', 'success', {}, { duration: 150 });
      logger.flush();

      const entry = logEntries.find((e) => e.message.includes('generate-content'));
      expect(entry).toBeDefined();
      expect(entry?.context.agentId).toBe('suki');
      expect(entry?.context.toolId).toBe('generate-content');
    });

    it('should log AI requests', () => {
      logger.logAIRequest('request', { agentId: 'millie' }, {
        prompt: 'Test prompt',
        tokens: 100,
      });
      logger.flush();

      const entry = logEntries.find((e) => e.message.includes('AI request'));
      expect(entry).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const config = logger.getConfig();
      expect(config).toBeDefined();
      expect(config.minLevel).toBeDefined();
      expect(config.outputFormat).toBeDefined();
    });

    it('should allow runtime configuration changes', () => {
      const originalConfig = logger.getConfig();

      logger.configure({ outputFormat: 'pretty' });
      expect(logger.getConfig().outputFormat).toBe('pretty');

      // Reset
      logger.configure({ outputFormat: originalConfig.outputFormat });
    });
  });

  describe('Buffer Management', () => {
    it('should flush buffer on demand', () => {
      let outputCount = 0;
      const handler = () => outputCount++;
      logger.on('output', handler);

      testLogger.info('Buffered message 1');
      testLogger.info('Buffered message 2');
      logger.flush();

      expect(outputCount).toBeGreaterThan(0);
      logger.off('output', handler);
    });

    it('should return recent logs', () => {
      testLogger.info('Recent log 1');
      testLogger.info('Recent log 2');
      testLogger.info('Recent log 3');

      const recent = logger.getRecentLogs(10);
      expect(recent.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('LoggingService Singleton', () => {
  it('should return the same instance', () => {
    const instance1 = LoggingService.getInstance();
    const instance2 = LoggingService.getInstance();
    expect(instance1).toBe(instance2);
  });
});
