const _ = require('../../core/lodash3');
const fs = require('node:fs');
const util = require('../../core/util');
var config = util.getConfig();
const dirs = util.dirs();
var tulind=require('../../core/tulind');
const log = require('../../core/log');
const allowedTulipIndicators = _.keys(tulind);
const {EventEmitter} = require('node:events');

const async=require('async');
async.map(['baseTradingMethod.js','asyncIndicatorRunner.js','tradingAdvisor.js'], fs.stat, function(err, results){_.noop;});

const AsyncIndicatorRunner = function() {
  this.tulipIndicators = {};
  this.candleProps = {open: [],high: [],low: [],close: [],volume: []};
  this.candlePropsCacheSize = 10000;
  this.inflight = false;
  this.backlog = [];
  this.age = 0;
  _.bindAll(this,_.functions(this));
}

AsyncIndicatorRunner.prototype.processCandle = function(candle, next) {
  if(this.inflight) {
    return this.backlog.push({candle, next});
  }

  this.age++;
  this.inflight = false;

  this.candleProps.open.push(candle.open);
  this.candleProps.high.push(candle.high);
  this.candleProps.low.push(candle.low);
  this.candleProps.close.push(candle.close);
  this.candleProps.volume.push(candle.volume);

  if(this.age > this.candlePropsCacheSize) {
    this.candleProps.open.shift();
    this.candleProps.high.shift();
    this.candleProps.low.shift();
    this.candleProps.close.shift();
    this.candleProps.volume.shift();
  }

  this.calculateIndicators(next);
}

AsyncIndicatorRunner.prototype.calculateIndicators = function(next) {
  const done = _.after(
    _.size(this.tulipIndicators),this.handlePostFlight(next)
  );

  // handle result from tulip
  var tulindResultHander = name => (err, result) => {
    if(err)
      util.die('TULIP ERROR:', err);

    this.tulipIndicators[name].result = _.mapValues(result, v => _.last(v));
    done();
  }

  // handle result from tulip indicators
  _.each(
    this.tulipIndicators,
    (indicator, name) => indicator.run(
      this.candleProps,
      tulindResultHander(name)
    )
  );
}

AsyncIndicatorRunner.prototype.handlePostFlight = function(next) {
  return () => {
    next();
    this.inflight = false;

    if(this.backlog.length) {
      const { candle, next } = this.backlog.shift();
      this.processCandle(candle, next);
    }
  }
}

AsyncIndicatorRunner.prototype.addTulipIndicator = function(name, type, parameters) {
  if(!tulind) {
    util.die('Tulip indicators is not enabled');
  }

  if(this.setup)
    util.die('Can only add tulip indicators in the init method!');

  var basectx = this;

  this.tulipIndicators[name] = {
    run: tulind[type].create(parameters),
    result: NaN
  }
}

module.exports = AsyncIndicatorRunner;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
