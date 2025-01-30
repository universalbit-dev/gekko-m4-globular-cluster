/* CODEPILOT EXPLAIN

The core/dlna/candleCreator.js file is responsible for creating candlestick data from trade data. Here is an overview of its components:

    Imports and Initial Setup:
        Uses bluebird for promises and underscore for utility functions.
        Imports EventEmitter for event handling and utility modules like moment for date manipulation.
        Defines a constant expects set to 3 seconds for the expected interval between candles.

    CandleCreator Class:
        Constructor: Initializes the CandleCreator instance, sets a threshold date, and an empty buckets object to store trades.
        write(batch): Main method to process a batch of trades:
            Filters trades based on the threshold.
            Calculates candles from the trades.
            Adds empty candles if no trades occurred in the expected interval.
            Updates the threshold to the start of the last candle and emits the candles event.
        filter(trades): Filters trades to include only those after the threshold.
        fillBuckets(trades): Organizes trades into buckets based on the second they occurred.
        calculateCandles(): Creates candles from the trades in each bucket.
        calculateCandle(trades): Calculates the properties of a single candle (open, high, low, close, volume, etc.) from the trades.
        addEmptyCandles(candles): Adds empty candles if no trades occurred in the expected interval of 3 seconds.

    Event Handling:
        Utilizes EventEmitter to emit candles events after processing trade data into candle data.

The CandleCreator class processes raw trade data into structured candlestick data, ensuring regular intervals even if no trades occurred in some intervals.

*/
//https://en.wikipedia.org/wiki/Candlestick_chart
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const { EventEmitter } = require("events");
var moment = require('moment');
var util = require('../util.js');
var config = util.getConfig();
var expects=3; /* */

var CandleCreator = function() {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(this));
  this.threshold = moment("1970-01-01 22:57:36", "YYYY-MM-DD HH:mm:ss");
  this.buckets = {};
}
util.makeEventEmitter(CandleCreator);

CandleCreator.prototype.write = function(batch) {
  var trades = batch.data;
  if(_.isEmpty(trades))return;
  trades = this.filter(trades);
  this.fillBuckets(trades);
  var candles = this.calculateCandles();

  candles = this.addEmptyCandles(candles);

  if(_.isEmpty(candles))
    return;
  this.threshold = candles.pop().start;
  this.emit('candles', candles);
}

CandleCreator.prototype.filter = function(trades) {
  return _.filter(trades, function(trade) {
    return trade.date > this.threshold;
  }, this);
}

/*COPILOT EXPLAIN
The fillBuckets method in CandleCreator class organizes trades into buckets based on the second they occurred.

Here's a breakdown of what this method does:

    Iterates over each trade.
    Formats the trade's date to a string representing the second it occurred.
    Checks if a bucket for that second exists; if not, it creates one.
    Adds the trade to the corresponding bucket.
    Stores the last trade processed.

This method helps group trades by their exact second, facilitating further processing like candle calculation.

*/
CandleCreator.prototype.fillBuckets = function(trades) {
  _.each(trades, function(trade) {
    var second = trade.date.format('YYYY-MM-DD HH:mm:ss');

    if(!(second in this.buckets))
      this.buckets[second] = [];

    this.buckets[second].push(trade);
  }, this);

  this.lastTrade = _.last(trades);
}
CandleCreator.prototype.calculateCandles = function() {
  var seconds = _.size(this.buckets);
  if (this.lastTrade !== undefined)
  // create a string referencing the seconds of this trade happened 
  var lastSecond = this.lastTrade.date.format('YYYY-MM-DD HH:mm:ss');

  var candles = _.map(this.buckets, function(bucket, name) 
  {
  var candle = this.calculateCandle(bucket);
  if(name !== lastSecond)delete this.buckets[name];return candle;
  }, this);
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

//expects a candle every 3 second, if nothing happened will add empty candle.
CandleCreator.prototype.addEmptyCandles = function(candles) {
  var amount = _.size(candles);
  if(!amount)return candles;

//iterator
  var start = _.first(candles).start.clone();
  var end = _.last(candles).start;
  var i, j = -1;

  var seconds = _.map(candles, function(candle) {
    return +candle.start;
  });

  while(start < end) {
    start.add(expects, 's');
    i = +start;
    j++;

    if(_.contains(seconds, i))
      continue; // we have a candle for 987 seconds

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
