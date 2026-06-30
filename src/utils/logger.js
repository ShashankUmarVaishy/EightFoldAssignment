/**
 * System Logger for Multi-Source Candidate Data Transformer.
 * Provides structured logging with support for tracking execution context.
 */
class Logger {
  constructor() {
    this.logs = [];
  }

  format(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...context
    };
  }

  info(message, context = {}) {
    const formatted = this.format('INFO', message, context);
    this.logs.push(formatted);
    console.log(`[INFO] ${timestampString(formatted.timestamp)}: ${message} ${formatContext(context)}`);
  }

  warn(message, context = {}) {
    const formatted = this.format('WARN', message, context);
    this.logs.push(formatted);
    console.warn(`[WARN] ${timestampString(formatted.timestamp)}: ${message} ${formatContext(context)}`);
  }

  error(message, error, context = {}) {
    const errorDetails = error ? {
      error_message: error.message,
      error_stack: error.stack
    } : {};
    const formatted = this.format('ERROR', message, { ...context, ...errorDetails });
    this.logs.push(formatted);
    console.error(`[ERROR] ${timestampString(formatted.timestamp)}: ${message} ${formatContext(context)}`);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

function timestampString(isoString) {
  return isoString.replace('T', ' ').substring(0, 19);
}

function formatContext(context) {
  if (!context || Object.keys(context).length === 0) return '';
  try {
    return JSON.stringify(context);
  } catch {
    return '[Unable to stringify context]';
  }
}

export const logger = new Logger();
export default logger;
