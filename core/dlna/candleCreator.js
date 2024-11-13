/*

*/
const EventEmitter=require('node:events');
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
var moment = require('moment');
var util = require('../../core/util');
var config = require('../../core/util.js').getConfig();
var expects=config.expects.candle;

var CandleCreator = function() {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(CandleCreator.prototype));
  this.threshold = moment("1970-01-01 22:57:36", "YYYY-MM-DD HH:mm:ss");
  this.buckets = {};
}
util.makeEventEmitter(CandleCreator);util.inherit(CandleCreator, EventEmitter);

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

// put each trade in a per second bucket
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

//expects a candle every 987 second, if nothing happened during 987 seconds will add empty candle.
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
