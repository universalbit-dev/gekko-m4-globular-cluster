const _ = require('underscore');
const moment = require('moment');
const fmt = require('util').format;
const { EventEmitter } = require('events');
const util = require('./util');
const config = util.getConfig();

const debug = process.env.DEBUG !== undefined ? process.env.DEBUG === 'true' : config.debug;
const silent = process.env.SILENT !== undefined ? process.env.SILENT === 'true' : config.silent;
const env = process.env.GEKKO_ENV || util.gekkoEnv();

let output;
if (env === 'standalone') {
  output = console;
} else if (env === 'child-process') {
  output = {
    error: (...args) => {
      try {
        process.send({ log: 'error', message: args.join(' ') });
      } catch (e) {
        console.error('[Logging IPC failed, fallback to console]', ...args);
      }
    },
    warn: (...args) => {
      try {
        process.send({ log: 'warn', message: args.join(' ') });
      } catch (e) {
        console.warn('[Logging IPC failed, fallback to console]', ...args);
      }
    },
    info: (...args) => {
      try {
        process.send({ log: 'info', message: args.join(' ') });
      } catch (e) {
        console.info('[Logging IPC failed, fallback to console]', ...args);
      }
    },
    write: (...args) => {
      try {
        process.send({ log: 'write', message: args.join(' ') });
      } catch (e) {
        console.log('[Logging IPC failed, fallback to console]', ...args);
      }
    }
  };
} else {
  output = console;
}

// Batching implementation
class LogBatcher {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(fn, args) {
    this.queue.push({ fn, args });
    if (!this.processing) {
      this.processing = true;
      setImmediate(() => this.process());
    }
  }

  process() {
    while (this.queue.length) {
      const { fn, args } = this.queue.shift();
      try {
        fn(...args);
      } catch (e) {
        // Fallback to console if error occurs
        console.error('[Batch Logging Error]', e, args);
      }
    }
    this.processing = false;
  }
}

const batcher = new LogBatcher();

class Log extends EventEmitter {
  _write(method, args, name) {
    if (silent) return;

    const label = name || method.toUpperCase();
    const message = `${moment().format('YYYY-MM-DD HH:mm:ss')} (${label}):\t${fmt.apply(null, args)}`;

    if (output && output[method]) {
      batcher.enqueue(output[method], [message]);
    } else {
      // Fallback to console if unknown method
      batcher.enqueue(console.log, [`[Unknown log method: ${method}]`, message]);
    }
  }

  error(...args) {
    this._write('error', args);
  }

  warn(...args) {
    this._write('warn', args);
  }

  info(...args) {
    this._write('info', args);
  }

  write(...args) {
    const message = fmt.apply(null, args);
    if (output && output.info) {
      batcher.enqueue(output.info, [message]);
    } else {
      batcher.enqueue(console.log, [message]);
    }
  }

  debug(...args) {
    if (debug && !silent) {
      this._write('info', args, 'DEBUG');
    }
  }
}

// Silent disables all logging
if (silent) {
  Log.prototype.debug = _.noop;
  Log.prototype.info = _.noop;
  Log.prototype.warn = _.noop;
  Log.prototype.write = _.noop;
}

// Make Log an EventEmitter for future extensibility
util.makeEventEmitter(Log);

module.exports = new Log();

/*
MIT License

Permission is hereby granted, free of charge, to use, copy, modify, and distribute this software, subject to the inclusion of this notice.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
*/

