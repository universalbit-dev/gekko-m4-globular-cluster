const _ = require('underscore');
const util = require('../../core/util');
const fs=require('fs-extra');
var config = util.getConfig();
const dirs = util.dirs();
const log = require('../../core/log');
const EventEmitter = require('events');
const ENV = util.gekkoEnv();
const mode = util.gekkoMode();
const startTime = util.getStartTime();
const indicatorsPath = dirs.methods + 'indicators/';
const indicatorFiles = fs.readdirSync(indicatorsPath);
const Indicators = {};
const async=require('async');

async.map(['baseTradingMethod.js','asyncIndicatorRunner.js','tradingAdvisor.js'], fs.stat, function(err, results){_.noop;});

const AsyncIndicatorRunner = require('./asyncIndicatorRunner');

_.each(indicatorFiles, function(indicator) {
  const indicatorName = indicator.split(".")[0];
  if (indicatorName[0] != "_")
    try {
      Indicators[indicatorName] = require(indicatorsPath + indicator);
    } catch (e) {
      log.error("Failed to load indicator", indicatorName);
    }
});

const allowedIndicators = _.keys(Indicators);

var Base = function(settings) {
  _.bindAll(this,_.functions(Base.prototype));
  EventEmitter.call(this);
  this.age = 0;
  this.processedTicks = 0;
  this.setup = false;
  this.settings = settings;
  this.tradingAdvisor = config.tradingAdvisor;
  this.priceValue = 'open';
  this.indicators = {};
  this.asyncTick = false;
  this.deferredTicks = [];

  this.propogatedAdvices = 0;
  this.completedWarmup = false;

  this.asyncIndicatorRunner = new AsyncIndicatorRunner();

  this._currentDirection;

  // make sure we have all methods
  _.each(['init', 'check'], function(fn) {
    if(!this[fn])
      util.die('No ' + fn + ' function in this strategy found.')
  }, this);

  if(!this.update)
    this.update = function() {};

  if(!this.end)
    this.end = function() {};

  if(!this.onTrade)
    this.onTrade = function() {};

  // let's run the implemented starting point
  this.init();

  if(_.isNumber(this.requiredHistory)) {
    log.debug('Ignoring strategy\'s required history, using the "config.tradingAdvisor.historySize" instead.');
  }
  this.requiredHistory = config.tradingAdvisor.historySize;

  if(!config.debug || !this.log)
    this.log = function() {};

  this.setup = true;

  if(_.size(this.asyncIndicatorRunner.tulipIndicators))
    this.asyncTick = true;
  else
    delete this.asyncIndicatorRunner;
}

// teach our base trading method events
util.makeEventEmitter(Base);util.inherit(Base, EventEmitter);


Base.prototype.tick = async function(candle, done) {
  this.age++;
  const emit =new EventEmitter();
  const afterAsync = () => {this.calculateSyncIndicators(candle, done);}

  if(this.asyncTick) {
    this.asyncIndicatorRunner.processCandle(candle, () => {
      this.tulipIndicators = this.asyncIndicatorRunner.tulipIndicators;
      afterAsync();
    });
  } else {afterAsync();}
}

Base.prototype.isBusy = function() {
  if(!this.asyncTick)return false;return this.asyncIndicatorRunner.inflight;}

Base.prototype.calculateSyncIndicators = function(candle, done) {
// update all indicators
var price = candle[this.priceValue];
_.each(this.indicators, function(i) {
  if(i.input === 'price')
  i.update(price);
  if(i.input === 'candle')
  i.update(candle);
},
this);

this.propogateTick(candle);
return done();
}

Base.prototype.propogateTick = function(candle) {
  this.candle = candle;
  this.update(candle);
  this.processedTicks++;
  isAllowedToCheck = this.requiredHistory <= this.age;

  if(!this.completedWarmup) {

    // in live mode we might receive more candles
    // than minimally needed. In that case check
    // whether candle start time is > startTime
    var isPremature = false;

    if(mode === 'realtime') {
      const startTimeMinusCandleSize = startTime
        .clone()
        .subtract(this.tradingAdvisor.candleSize, "minutes");

      isPremature = candle.start < startTimeMinusCandleSize;
    }

    if(isAllowedToCheck && !isPremature) {
      this.completedWarmup = true;
      this.emit(
        'stratWarmupCompleted',
        {start: candle.start.clone()}
      );
    }
  }

  if(this.completedWarmup) {
    this.log(candle);
    this.check(candle);

    if(
      this.asyncTick &&
      this.hasSyncIndicators &&
      this.deferredTicks.length
    ) {
      return this.tick(this.deferredTicks.shift())
    }
  }

  const indicators = {};
  _.each(this.indicators, (indicator, name) => {
    indicators[name] = typeof indicator.result === 'object' ? { ...indicator.result } : indicator.result;
  });

  _.each(this.tulipIndicators, (indicator, name) => {
    indicators[name] = indicator.result.result
      ? indicator.result.result
      : indicator.result;
  });

  this.emit('stratUpdate', {
    date: candle.start.clone(),
    indicators
  });

  // are we totally finished?
  const completed = this.age === this.processedTicks;
  if(completed && this.finishCb)
    this.finishCb();
}

Base.prototype.processTrade = function(trade) {
  if(
    this._pendingTriggerAdvice &&
    trade.action === 'sell' &&
    this._pendingTriggerAdvice === trade.adviceId
  ) {
    // This trade came from a trigger of the previous advice,
    // update stored direction
    this._currentDirection = 'short';
    this._pendingTriggerAdvice = null;
  }

  this.onTrade(trade);
}

Base.prototype.addTulipIndicator = function(name, type, parameters) {
  this.asyncIndicatorRunner.addTulipIndicator(name, type, parameters);
}

Base.prototype.addIndicator = function(name, type, parameters) {

  if(this.setup)
    util.die('Can only add indicators in the init method!');

  return this.indicators[name] = new Indicators[type](parameters);

  // some indicators need a price stream, others need full candles
}

Base.prototype.advice = function(newDirection) {
  // ignore legacy soft advice
  if(!newDirection) {
    return;
  }

  let trigger;
  if(_.isObject(newDirection)) {
    if(!_.isString(newDirection.direction)) {
      log.error('Strategy emitted unparsable advice:', newDirection);
      return;
    }

    if(newDirection.direction === this._currentDirection) {
      return;
    }

    if(_.isObject(newDirection.trigger)) {
      if(newDirection.direction !== 'long') {
        log.warn(
          'Strategy adviced a stop on not long, this is not supported.',
          'As such the stop is ignored'
        );
      } else {

        // the trigger is implemented in a trader
        trigger = newDirection.trigger;

        if(trigger.trailPercentage && !trigger.trailValue) {
          trigger.trailValue = trigger.trailPercentage / 100 * this.candle.close;
          log.info('[StratRunner] Trailing stop trail value specified as percentage, setting to:', trigger.trailValue);
        }
      }
    }

    newDirection = newDirection.direction;
  }

  if(newDirection === this._currentDirection) {
    return;
  }

  if(newDirection === 'short' && this._pendingTriggerAdvice) {
    this._pendingTriggerAdvice = null;
  }

  this._currentDirection = newDirection;
  this.propogatedAdvices++;

  const advice = {
    id: 'advice-' + this.propogatedAdvices,
    recommendation: newDirection
  };

  if(trigger) {
    advice.trigger = trigger;
    this._pendingTriggerAdvice = 'advice-' + this.propogatedAdvices;
  } else {
    this._pendingTriggerAdvice = null;
  }

  this.emit('advice', advice);

  return this.propogatedAdvices;
}

Base.prototype.notify = function(content) {
  this.emit('stratNotification', {
    content,
    date: new Date(),
  })
}

Base.prototype.finish = function(done) {
  // Because the strategy might be async we need
  // to be sure we only stop after all candles are
  // processed.
  if(!this.asyncTick) {
    this.end();
    return done();
  }

  if(this.age === this.processedTicks) {
    this.end();
    return done();
  }

  // we are not done, register cb
  // and call after we are..
  this.finishCb = done;
}

module.exports = Base;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
