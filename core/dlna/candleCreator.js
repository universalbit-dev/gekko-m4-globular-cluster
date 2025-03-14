/* copilot explain

Imports and Initial Setup:

    Various modules are imported, including underscore for utility functions, EventEmitter for event handling, moment for date manipulation, and util for utility functions.
    A constant expects is set to 3, indicating the expected interval for candles.

CandleCreator Class:

    Constructor (CandleCreator): Initializes the CandleCreator instance. It extends EventEmitter, binds all functions to the instance using underscore, initializes a threshold date,and
    sets up an empty buckets object for storing trades.
    
    write(batch): Processes a batch of trades. It filters the trades, fills the buckets, calculates candles, and adds empty candles if necessary. It updates the threshold to the start 
    of the last candle and emits a candles event with the processed candles.
    filter(trades): Filters trades to only include those that occurred after the threshold.
    fillBuckets(trades): Puts each trade into a per-second bucket based on its date.
    calculateCandles(): Calculates candles from the filled buckets. It deletes buckets that have already been processed and returns the calculated candles.
    calculateCandle(trades): Calculates a single candle from a list of trades.
    
    It calculates the open, high, low, close, volume-weighted average price (VWAP), volume, and number of trades.
    addEmptyCandles(candles): Adds empty candles for any periods where no trades occurred, ensuring a consistent candle interval.

Event Handling:

    The class extends EventEmitter to emit candles events, allowing other components to listen and react to new candles.
    This class processes trade data, creates candles, and emits events for other components to handle, ensuring consistent intervals even when no trades occur.
*/

const _ = require("underscore");
const { EventEmitter } = require("events");
var moment = require('moment');
var util = require('../util.js');
var config = util.getConfig();
var expects = 300;

var CandleCreator = function() {
  EventEmitter.call(this);
  _.bindAll(this, _.functions(this));
  this.threshold = moment("1970-01-01 22:57:36", "YYYY-MM-DD HH:mm:ss");
  this.buckets = {};
}
util.makeEventEmitter(CandleCreator);

CandleCreator.prototype.write = function(batch) {
  console.log("write method called with batch:", batch);
  var trades = batch.data;
  if (_.isEmpty(trades)) return;
  trades = this.filter(trades);
  console.log("Filtered trades:", trades);
  this.fillBuckets(trades);
  var candles = this.calculateCandles();
  console.log("Calculated candles before adding empty:", candles);

  candles = this.addEmptyCandles(candles);
  console.log("Candles after adding empty:", candles);

  if (_.isEmpty(candles)) return;
  this.threshold = candles.pop().start;
  console.log("New threshold set to:", this.threshold);
  this.emit('candles', candles);
  console.log("Emitted candles event");
}

CandleCreator.prototype.filter = function(trades) {
  return _.filter(trades, function(trade) {
    return trade.date > this.threshold;
  }, this);
}

CandleCreator.prototype.fillBuckets = function(trades) {
  _.each(trades, function(trade) {
    var second = trade.date.format('YYYY-MM-DD HH:mm:ss');

    if (!(second in this.buckets))
      this.buckets[second] = [];

    this.buckets[second].push(trade);
  }, this);

  this.lastTrade = _.last(trades);
  console.log("Buckets filled:", this.buckets);
}

CandleCreator.prototype.calculateCandles = function() {
  var seconds = _.size(this.buckets);
  if (this.lastTrade !== undefined)
    var lastSecond = this.lastTrade.date.format('YYYY-MM-DD HH:mm:ss');

  var candles = _.map(this.buckets, function(bucket, name) {
    var candle = this.calculateCandle(bucket);
    if (name !== lastSecond) delete this.buckets[name];
    return candle;
  }, this);
  console.log("Candles calculated:", candles);
  return candles;
}

CandleCreator.prototype.calculateCandle = function(trades) {
  var first = _.first(trades);

  var f = parseFloat;
  var candle = {
    start: first.date.clone().startOf('second'),
    open: f(first.price),
    high: f(first.price),
    low: f(first.price),
    close: f(_.last(trades).price),
    vwp: 0,
    volume: 0,
    trades: _.size(trades)
  };

  _.each(trades, function(trade) {
    candle.high = _.max([candle.high, f(trade.price)]);
    candle.low = _.min([candle.low, f(trade.price)]);
    candle.volume += f(trade.amount);
    candle.vwp += f(trade.price) * f(trade.amount);
  });
  candle.vwp /= candle.volume;
  return candle;
}

CandleCreator.prototype.addEmptyCandles = function(candles) {
  var amount = _.size(candles);
  if (!amount) return candles;

  var start = _.first(candles).start.clone();
  var end = _.last(candles).start;
  var i, j = -1;

  var seconds = _.map(candles, function(candle) {
    return +candle.start;
  });

  while (start < end) {
    start.add(expects, 's');
    i = +start;
    j++;

    if (_.contains(seconds, i))
      continue;

    var lastPrice = candles[j].close;

    candles.splice(j + 1, 0, {
      start: start.clone(),
      open: lastPrice,
      high: lastPrice,
      low: lastPrice,
      close: lastPrice,
      vwp: lastPrice,
      volume: 0,
      trades: 0
    });
  }
  return candles;
}

module.exports = CandleCreator;

/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
