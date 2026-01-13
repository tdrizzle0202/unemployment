type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

function formatLogEntry(entry: LogEntry): string {
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      const entry: LogEntry = {
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        context,
      };
      console.debug(formatLogEntry(entry));
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) {
      const entry: LogEntry = {
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        context,
      };
      console.info(formatLogEntry(entry));
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      const entry: LogEntry = {
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        context,
      };
      console.warn(formatLogEntry(entry));
    }
  },

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    if (shouldLog('error')) {
      const errorContext = error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : { error };

      const entry: LogEntry = {
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        context: { ...context, ...errorContext },
      };
      console.error(formatLogEntry(entry));
    }
  },

  // Track LLM usage
  trackLLMCall(params: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    success: boolean;
  }) {
    this.info('LLM call completed', params);
  },

  // Track RAG retrieval
  trackRetrieval(params: {
    query: string;
    stateCode: string;
    resultsCount: number;
    latencyMs: number;
  }) {
    this.debug('RAG retrieval completed', params);
  },
};
