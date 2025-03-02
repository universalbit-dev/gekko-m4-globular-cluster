/**/
const _ = require("underscore");
const moment = require('moment');
const { Readable } = require('stream');
const util = require('../util');
const log = require(util.dirs().core + 'log.js');
const fs = require('fs-extra');
const noop = require('node-noop').noop;

const config = util.getConfig();
const daterange = config.backtest.daterange;
const requiredHistory = config.tradingAdvisor.candleSize;

const Reader = require('../../plugins/sqlite/reader');

const to = moment.utc(daterange.to);
const from = moment.utc(daterange.from).subtract(requiredHistory, 'm');

if (to <= from) util.die('This daterange does not make sense.');
if (!config.paperTrader.enabled) util.die('You need to enable the "Paper Trader" first to run a backtest.');

if (!from.isValid()) util.die('invalid `from`');
if (!to.isValid()) util.die('invalid `to`');

class Market extends Readable {
  constructor() {
    super({ objectMode: true });
    _.bindAll(this, _.functions(this));
    this.pushing = false;
    this.ended = false;
    this.closed = false;

    log.write('');
    log.info('\t=================================================');
    log.info('\tWARNING: BACKTESTING FEATURE NEEDS PROPER TESTING');
    log.info('\tWARNING: ACT ON THESE NUMBERS AT YOUR OWN RISK!');
    log.info('\t=================================================');
    log.write('');

    try {
      this.reader = new Reader();
    } catch (err) {
      log.error('Failed to initialize reader:', err);
      util.die('Error initializing reader');
    }

    log.debug('*** Requested', requiredHistory, 'minutes of warmup history data, so reading db since', from.format(), 'UTC', 'and start backtest at', daterange.from, 'UTC');

    this.batchSize = config.backtest.batchSize;
    this.iterator = {
      from: from.clone(),
      to: from.clone().add(this.batchSize, 'm').subtract(1, 's')
    };
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
    if (this.iterator.to >= to) {
      this.iterator.to = to;
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

util.makeEventEmitter(Market);

module.exports = Market;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


