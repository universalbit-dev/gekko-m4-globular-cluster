/**
 * TradingAdvisor is a core component of the Gekko trading bot, responsible for managing trading strategies,
 * handling real-time and historical data, and processing candles for strategy execution. It integrates with
 * candle batching and custom strategies to provide a modular and extensible trading framework.
 *
 * Key Features:
 * - Dynamically loads and initializes trading strategies based on user configuration.
 * - Processes incoming candle data using a batching system for custom candle sizes.
 * - Supports both real-time and historical data preparation for strategy execution.
 * - Relays trading advice, strategy updates, and notifications to other components.
 * - Handles trade completion events and propagates updates to trading strategies.
 *
 * Usage:
 * - Configure the strategy in the Gekko configuration file under `tradingAdvisor`.
 * - Ensure the strategy file exists in the methods directory with the correct name.
 * - Process candles with `processCandle`, which interacts with the batching system and strategy.
 * - Extensible for implementing new strategies and integrating with the Gekko ecosystem.
 *
 * License:
 * The MIT License (MIT)
 * Copyright (c) 2014-2017 Mike van Rossum
 */
const _ = require("underscore");
const {EventEmitter} = require("events");class Event extends EventEmitter{};
const fs = require("fs-extra");
const util = require('../../core/util');const dirs = util.dirs();
var config = util.getConfig();
const moment = require('moment');
const log = require("../../core/log.js");

var CandleBatcher = require('../../core/candleBatcher');

var Actor = function(done){
  _.bindAll(this,_.functions(this));
  EventEmitter.call(this);
  this.done = done;
  var batcher = new CandleBatcher(config.tradingAdvisor.candleSize);this.batcher=batcher;
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
util.makeEventEmitter(Actor);util.inherit(Event, Actor);

Actor.prototype.setupStrategy = function() 
{
  if(!fs.existsSync(dirs.methods + this.strategyName + '.js'))
  util.die('Gekko can\'t find the strategy "' + this.strategyName + '"');
  log.info('\t', 'Using the strategy: ' + this.strategyName);
  var strategy = require(dirs.methods + this.strategyName);

  const WrappedStrategy = require("./baseTradingMethod");
  _.each(strategy, function(fn, name) {WrappedStrategy.prototype[name] = fn;});
  let stratSettings;
  if(config[this.strategyName]) {stratSettings = config[this.strategyName];}

 this.strategy = new WrappedStrategy(stratSettings);
  this.strategy
    .on('stratWarmupCompleted',e => this.deferredEmit('stratWarmupCompleted', e))
    .on('advice', this.relayAdvice)
    .on('stratUpdate',e => this.deferredEmit('stratUpdate', e))
    .on('stratNotification',e => this.deferredEmit('stratNotification', e))
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

Actor.prototype.emitStratCandle = function (candle) {
  if (!candle) {
    console.error('Candle is undefined');
    return;
  }
  if (!candle.close) {
    console.error('Candle.close is undefined', candle);
    return;
  }
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


