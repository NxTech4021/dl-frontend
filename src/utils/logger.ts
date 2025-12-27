/**
 * Logger utility for production-safe logging
 * Logs are only output in development mode
 */

const isDev = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDev;
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const formattedMessage = `${timestamp} ${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.log(formattedMessage, ...args);
        break;
      case 'info':
        console.log(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.formatMessage('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.formatMessage('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.formatMessage('error', message, ...args);
  }
}

// Pre-configured loggers for different modules
export const chatLogger = new Logger({ prefix: 'Chat' });
export const socketLogger = new Logger({ prefix: 'Socket' });
export const matchLogger = new Logger({ prefix: 'Match' });

// Default logger
export const logger = new Logger();

// Factory function to create module-specific loggers
export const createLogger = (prefix: string, enabled?: boolean): Logger => {
  return new Logger({ prefix, enabled });
};

export default Logger;
