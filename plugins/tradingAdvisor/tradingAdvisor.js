var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const {EventEmitter} = require("events");
const fs = require("fs-extra");
const util = require('../../core/util');
var config = util.getConfig();const dirs = util.dirs();

const moment = require('moment');
const log = require("../../core/log.js");
const CandleBatcher = require('../../core/candleBatcher');
const isLeecher = config.market && config.market.type === 'leech';

const Actor = function(done){
  _.bindAll(this,_.functions(this));
  EventEmitter.call(this);
  this.done = done;
  this.batcher = new CandleBatcher(config.tradingAdvisor.candleSize);
  this.strategyName = config.tradingAdvisor.method;
  this.setupStrategy();

  var mode = util.gekkoMode();

  if(mode === 'realtime')
{
    var Stitcher = require('../../core/tools/dataStitcher');
    var stitcher = new Stitcher(this.batcher);
    stitcher.prepareHistoricalData(done);
}

}
util.makeEventEmitter(Actor);

Actor.prototype.setupStrategy = function() {
  if(!fs.existsSync(dirs.methods + this.strategyName + '.js'))
    util.die('Gekko can\'t find the strategy "' + this.strategyName + '"');

  log.info('\t', 'Using the strategy: ' + this.strategyName);

  const strategy = require(dirs.methods + this.strategyName);
  const WrappedStrategy = Promise.promisifyAll(require("./baseTradingMethod"));
  _.each(strategy, function(fn, name) {WrappedStrategy.prototype[name] = fn;});

  let stratSettings;
  if(config[this.strategyName]) {stratSettings = config[this.strategyName];}

  this.strategy = new WrappedStrategy(stratSettings);
  this.strategy
    .on(
      'stratWarmupCompleted',
      e => this.deferredEmit('stratWarmupCompleted', e)
    )
    .on('advice', this.relayAdvice)
    .on(
      'stratUpdate',
      e => this.deferredEmit('stratUpdate', e)
    ).on('stratNotification',
      e => this.deferredEmit('stratNotification', e)
    )

  this.strategy
    .on('tradeCompleted', this.processTradeCompleted);

  this.batcher
    .on('candle', _candle => {
      const { id, ...candle } = _candle;
      this.deferredEmit('stratCandle', candle);
      this.emitStratCandle(candle);
    });
}

Actor.prototype.processCandle = function(candle, done) {
  this.candle = candle;
  const completedBatch = this.batcher.write([candle]);
  if(completedBatch) {
    this.next = done;
  } else {
    done();
    this.next = false;
  }
  this.batcher.flush();
}

// propogate a custom sized candle to the trading strategy
Actor.prototype.emitStratCandle = function(candle) {
  const next = this.next || _.noop;
  this.strategy.tick(candle, next);
}

Actor.prototype.processTradeCompleted = function(trade) {
  this.strategy.processTrade(trade);
}

Actor.prototype.finish = function(done) {
  this.strategy.finish(done);
}

// EMITTERS
Actor.prototype.relayAdvice = function(advice) {
  advice.date = this.candle.start.clone().add(1, 'minute');
  this.deferredEmit('advice', advice);
}

module.exports = Actor;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
