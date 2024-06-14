const _ = require('../lodash3');require('lodash-migrate');
var moment = require('moment');
var util = require('../../core/util');
var config = require('../../core/util.js').getConfig();
const {EventEmitter} = require('node:events');

var CandleCreator_ms = function() {
  _.bindAll(this);

  this.threshold = moment("1970-01-01", "YYYY-MM-DD");

  this.buckets = {};
}

util.makeEventEmitter(CandleCreator_ms);

CandleCreator_ms.prototype.write = function(batch) {
  var trades = batch.data;

  if(_.isEmpty(trades))
    return;

  trades = this.filter(trades);
  this.fillBuckets(trades);
  var candles = this.calculateCandles();

  candles = this.addEmptyCandles(candles);

  if(_.isEmpty(candles))
    return;  

  this.threshold = candles.pop().start;

  this.emit('candles', candles);
}

CandleCreator_ms.prototype.filter = function(trades) {
  return _.filter(trades, function(trade) {
    return trade.date > this.threshold;
  }, this);
}

CandleCreator_ms.prototype.fillBuckets = function(trades) {
  _.each(trades, function(trade) {
    var millisecond = trade.date.format('YYYY-MM-DD HH:mm:ss.SSS');

    if(!(millisecond in this.buckets))
      this.buckets[millisecond] = [];

    this.buckets[millisecond].push(trade);
  }, this);

  this.lastTrade = _.last(trades);
}

CandleCreator_ms.prototype.calculateCandles = function() {
  var milliseconds = _.size(this.buckets);

  
  if (this.lastTrade !== undefined)
    var lastMilliSecond = this.lastTrade.date.format('YYYY-MM-DD HH:mm:ss.SSS');

  var candles = _.map(this.buckets, function(bucket, name) {
    var candle = this.calculateCandle(bucket);

    if(name !== lastMilliSecond)
      delete this.buckets[name];

    return candle;
  }, this);

  return candles;
}

CandleCreator_ms.prototype.calculateCandle = function(trades) {
  var first = _.first(trades);

  var f = parseFloat;

  var candle = {
    start: first.date.clone().startOf('millisecond'),
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

CandleCreator_ms.prototype.addEmptyCandles = function(candles) {
  var amount = _.size(candles);
  if(!amount)
    return candles;

  // iterator
  var start = _.first(candles).start.clone();
  var end = _.last(candles).start;
  var i, j = -1;

  var milliseconds = _.map(candles, function(candle) {
    return +candle.start;
  });

  while(start < end) {
    start.add(1, 'S');
    i = +start;
    j++;

    if(_.contains(milliseconds, i))
      continue; // we have a candle for this millisecond

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

module.exports = CandleCreator_ms;

/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
