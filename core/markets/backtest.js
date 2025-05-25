const _ = require("underscore");
const moment = require('moment');
const { Readable } = require('stream');
const util = require('../util');
const log = require(util.dirs().core + 'log.js');
const fs = require('fs-extra');
const noop = require('node-noop').noop;

const config = util.getConfig();
const Reader = require('../../plugins/sqlite/reader');

// Dynamically determine from/to
Reader.prototype.getAvailableRange = function(callback) {
  this.db.get('SELECT MIN(start) as min, MAX(start) as max FROM candles', (err, row) => {
    if (err) return callback(err);
    callback(null, row.min, row.max);
  });
};

const reader = new Reader();
reader.getAvailableRange((err, min, max) => {
  if (err || min == null || max == null || isNaN(min) || isNaN(max)) {
    log.error('No valid data available in database or DB error!');
    log.error(`Received min: ${min}, max: ${max}`);
    process.exit(1);
  }

  const requiredHistory = config.tradingAdvisor.candleSize;
  const batchSize = config.backtest.batchSize;

  // Calculate UNIX seconds for from/to
  const from = moment.unix(min).utc().subtract(requiredHistory, 'm').unix();
  const to = moment.unix(max).utc().unix();

  // Extra validation
  if (isNaN(from) || isNaN(to)) {
    log.error('from or to is NaN after date math:', from, to, 'min:', min, 'max:', max);
    process.exit(1);
  }
  if (from > to) {
    log.error('from is after to! from:', from, 'to:', to);
    process.exit(1);
  }

  // Proper logging
  log.info(
    `[Backtest Range] Warmup: ${requiredHistory} minutes. DB read from ${moment.unix(from).utc().format()} UTC, start backtest at ${moment.unix(min).utc().format()} UTC, end at ${moment.unix(max).utc().format()} UTC`
  );

  const market = new BacktestStream(from, to, requiredHistory, batchSize);
  market.on('data', (data) => { log.info('Handle Data'); });
  market.on('end', () => { log.info('Backtest complete'); });
});

class BacktestStream extends Readable {
  constructor(from, to, requiredHistory, batchSize) {
    super({ objectMode: true });
    this.from = moment.isMoment(from) ? from : moment.unix(from).utc();
    this.to = moment.isMoment(to) ? to : moment.unix(to).utc();
    this.requiredHistory = requiredHistory;
    this.batchSize = batchSize;

    // Defensive: check validity
    if (!this.from.isValid() || !this.to.isValid()) {
      log.error('BacktestStream: from or to is invalid moment:', this.from, this.to);
      util.die('BacktestStream initialized with invalid from/to');
    }

    log.write('');
    log.info('\t==============================================');
    log.info('\t Backtest running! Results are for testing.');
    log.info('\t Analyze and optimize your strategy here!');
    log.info('\t==============================================');
    log.write('');

    try {
      this.reader = new Reader();
    } catch (err) {
      log.error('Failed to initialize reader:', err);
      util.die('Error initializing reader');
    }

    this.iterator = {
      from: this.from.clone(),
      to: this.from.clone().add(this.batchSize, 'm').subtract(1, 's')
    };
    this.ended = false;
    this.closed = false;
  }

  _read() {
    try {
      this.get();
    } catch (err) {
      log.error('Error in _read method:', err);
      util.die('Error in _read method');
    }
  }

  get() {
    // Defensive: check iterator validity
    if (!this.iterator.from.isValid() || !this.iterator.to.isValid()) {
      log.error('Iterator from/to is invalid:', this.iterator.from, this.iterator.to);
      util.die('Iterator has invalid from/to');
    }

    if (this.iterator.to >= this.to) {
      this.iterator.to = this.to.clone();
      this.ended = true;
    }

    try {
      this.reader.get(
        this.iterator.from.unix(),
        this.iterator.to.unix(),
        'full',
        this.processCandles.bind(this)
      );
    } catch (err) {
      log.error('Error fetching data from reader:', err);
      util.die('Error fetching data from reader');
    }
  }

  processCandles(err, candles) {
    if (err) {
      log.error('Error processing candles:', err);
      return;
    }

    if (!Array.isArray(candles)) {
      log.error('Candles data is not an array:', candles);
      util.die('Invalid candles data');
    }

    this.pushing = true;
    const amount = _.size(candles);

    if (amount === 0) {
      if (this.ended) {
        this.closed = true;
        this.reader.close();
        this.push({ isFinished: true });
      } else {
        util.die('Query returned no candles (do you have local data for the specified range?)');
      }
      return;
    }

    if (!this.ended && amount < this.batchSize) {
      const d = ts => moment.unix(ts).utc().format('YYYY-MM-DD');
      const fromDate = d(_.first(candles).start);
      const toDate = d(_.last(candles).start);
      log.warn(`Simulation based on incomplete market data (${this.batchSize - amount} missing between ${fromDate} and ${toDate}).`);
    }

    candles.forEach(c => {
      c.start = moment.unix(c.start);
      this.push(c);
    });

    this.pushing = false;

    this.iterator = {
      from: this.iterator.from.clone().add(this.batchSize, 'm'),
      to: this.iterator.from.clone().add(this.batchSize * 2, 'm').subtract(1, 's')
    };

    if (!this.closed) {
      setTimeout(() => {
        try {
          this.get();
        } catch (err) {
          log.error('Error in get method:', err);
          util.die('Error in get method');
        }
      }, 5);
    }
  }
}

module.exports = BacktestStream;
