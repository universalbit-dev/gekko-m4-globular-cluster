/* copilot explain

*/

const _ = require("underscore");
const { EventEmitter } = require("events");
const { Readable } = require('stream');
const util = require('../util');
const config = require('../util.js').getConfig();

const Heart = require('./heart.js');
const MarketDataProvider = require('./marketDataProvider.js');
const CandleManager = require('./candleManager.js');

class Dlna extends Readable {
  constructor(config) {
    super({ objectMode: true });
    EventEmitter.call(this);
    _.bindAll(this, _.functions(this));

    // Initialize internal modules
    try {
      this.heart = new Heart();
      this.marketDataProvider = new MarketDataProvider(config);
      this.candleManager = new CandleManager();
    } catch (error) {
      log.error('Error initializing internal modules:', error);
      throw error;
    }

    // Set up event handling
    this._setupEventHandling();

    // Start the heart pumping
    this.heart.pump();
  }

  _setupEventHandling() {
    try {
      // Relay marketUpdate event
      this.marketDataProvider.on('marketUpdate', e => this.emit('marketUpdate', e));
      // Relay marketStart event
      this.marketDataProvider.on('marketStart', e => this.emit('marketStart', e));
      // Output the candles
      this.candleManager.on('candles', this.pushCandles);
      // On every tick, retrieve trade data
      this.heart.on('tick', this.marketDataProvider.retrieve);
      // On new trade data, create candles
      this.marketDataProvider.on('trades', this.candleManager.processTrades);
    } catch (error) {
      log.error('Error setting up event handling:', error);
      throw error;
    }
  }

  _read() {
    // No-operation function required by the Readable stream
  }

  pushCandles(candles) {
    _.each(candles, this.push.bind(this));
  }
}
util.makeEventEmitter(Dlna);util.inherit(EventEmitter, Dlna);

module.exports = Dlna;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
