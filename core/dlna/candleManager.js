/*  CODEPILOT EXPLAIN
The candleManager.js file defines a Manager class responsible for handling the creation and relay of candlestick data from trade batches.

Key components:

    Dependencies: Includes required modules such as Promise, underscore, EventEmitter, moment, fs-extra, and utility functions.
    Constructor (Manager): Initializes the CandleCreator instance, binds functions, and sets up an event listener for 'candles' events.
    Methods:
        processTrades(tradeBatch): Passes a batch of trades to CandleCreator for processing.
        relayCandles(candles): Emits 'candles' events with the created candlestick data.

The class uses EventEmitter to handle and relay candlestick data events.

*/
//https://en.wikipedia.org/wiki/Candlestick_chart
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const { EventEmitter } = require("events");
var moment = require('moment');
const fs = require("fs-extra");
var util = require('../util.js');
var dirs = util.dirs();
var config = util.getConfig();
var log = require('../log.js');
var CandleCreator = require('./candleCreator.js');

var Manager = function(candle) {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(this));
  this.candleCreator = new CandleCreator;
  this.candleCreator
  .on('candles', this.relayCandles);
};
util.makeEventEmitter(Manager);

Manager.prototype.processTrades = function(tradeBatch) {this.candleCreator.write(tradeBatch);}
Manager.prototype.relayCandles = function(candles) {this.emit('candles', candles);}
module.exports = Manager;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
