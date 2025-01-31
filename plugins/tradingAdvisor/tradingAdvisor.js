/**
* @see {@link https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/tradingAdvisor/tradingAdvisor.md|GitHub}
 */

/* 
    Copilot Enhancements for tradingAdvisor.js 
    Add JSDoc Comments: Adding JSDoc comments will help to document the functions and improve code readability.
    Use Modern JavaScript Syntax: Update the code to use ES6+ syntax, such as const, let, arrow functions, and destructuring.
    Improve Error Handling: Add more detailed error handling and logging to help with debugging.
*/

const _ = require("underscore");
const { EventEmitter } = require("events");
const fs = require("fs-extra");
const util = require('../../core/util');
const moment = require('moment');
const log = require("../../core/log.js");
const CandleBatcher = require('../../core/candleBatcher');

const dirs = util.dirs();
let config = util.getConfig();

class Actor extends EventEmitter {
  constructor(done) {
    super();
    _.bindAll(this, _.functions(this));
    this.done = done;
    this.batcher = new CandleBatcher(config.tradingAdvisor.candleSize);
    this.strategyName = config.tradingAdvisor.method;
    this.setupStrategy();
    const mode = util.gekkoMode();

    if (mode === 'realtime') {
      const Stitcher = require('../../core/tools/dataStitcher');
      const stitcher = new Stitcher(this.batcher);
      stitcher.prepareHistoricalData(done);
    }
  }

  /**
   * Setup the strategy by requiring the strategy file and initializing it.
   */
  setupStrategy() {
    if (!fs.existsSync(`${dirs.methods}${this.strategyName}.js`)) {
      util.die(`Gekko can't find the strategy "${this.strategyName}"`);
    }
    log.info('\t', 'Using the strategy: ' + this.strategyName);
    const strategy = require(`${dirs.methods}${this.strategyName}`);
    const WrappedStrategy = require("./baseTradingMethod");

    _.each(strategy, (fn, name) => {
      WrappedStrategy.prototype[name] = fn;
    });

    const stratSettings = config[this.strategyName] || {};
    this.strategy = new WrappedStrategy(stratSettings);

    this.strategy
      .on('stratWarmupCompleted', e => this.deferredEmit('stratWarmupCompleted', e))
      .on('advice', this.relayAdvice)
      .on('stratUpdate', e => this.deferredEmit('stratUpdate', e))
      .on('stratNotification', e => this.deferredEmit('stratNotification', e))
      .on('tradeCompleted', this.processTradeCompleted);

    this.batcher.on('candle', _candle => {
      const { id, ...candle } = _candle;
      this.deferredEmit('stratCandle', candle);
      this.emitStratCandle(candle);
    });
  }

  /**
   * Process a candle and pass it to the batcher.
   * @param {Object} candle - The candle to process
   * @param {Function} done - Callback function when processing is done
   */
  processCandle(candle, done) {
    this.candle = candle;
    const completedBatch = this.batcher.write([candle]);
    if (completedBatch) {
      this.next = done;
    } else {
      done();
      this.next = false;
    }
    this.batcher.flush();
  }

  /**
   * Propagate a custom-sized candle to the trading strategy.
   * @param {Object} candle - The candle to emit
   */
  emitStratCandle(candle) {
    const next = this.next || _.noop;
    this.strategy.tick(candle, next);
  }

  /**
   * Process a completed trade.
   * @param {Object} trade - The completed trade
   */
  processTradeCompleted(trade) {
    this.strategy.processTrade(trade);
  }

  /**
   * Finish the strategy.
   * @param {Function} done - Callback function when finished
   */
  finish(done) {
    this.strategy.finish(done);
  }

  /**
   * Relay advice from the strategy.
   * @param {Object} advice - The advice to relay
   */
  relayAdvice(advice) {
    advice.date = this.candle.start.clone().add(1, 'minute');
    this.deferredEmit('advice', advice);
  }
}

module.exports = Actor;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
