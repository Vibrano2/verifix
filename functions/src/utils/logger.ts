/**
 * Logger Utility
 * Wrapper around Firebase Functions logger for structured logging
 */

import * as functions from 'firebase-functions';

export class Logger {
  /**
   * Log informational message
   */
  static info(message: string, ...args: any[]): void {
    functions.logger.info(message, ...args);
  }

  /**
   * Log warning message
   */
  static warn(message: string, ...args: any[]): void {
    functions.logger.warn(message, ...args);
  }

  /**
   * Log error message
   */
  static error(message: string, error?: any, ...args: any[]): void {
    if (error) {
      functions.logger.error(message, {
        error: error.message || error,
        stack: error.stack,
        ...args
      });
    } else {
      functions.logger.error(message, ...args);
    }
  }

  /**
   * Log debug message (only in development)
   */
  static debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      functions.logger.debug(message, ...args);
    }
  }

  /**
   * Log with custom severity
   */
  static log(severity: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG', message: string, ...args: any[]): void {
    switch (severity) {
      case 'INFO':
        this.info(message, ...args);
        break;
      case 'WARNING':
        this.warn(message, ...args);
        break;
      case 'ERROR':
        this.error(message, ...args);
        break;
      case 'DEBUG':
        this.debug(message, ...args);
        break;
    }
  }
}
