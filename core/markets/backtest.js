var Promise = require("bluebird");const _ =require("underscore");
var util = require('../util');
var config = util.getConfig();
var dirs = util.dirs();
var log = require(dirs.core + 'log.js');
var moment = require('moment');

var adapter = 'sqlite adapter';
var Reader = require('../../plugins/sqlite/reader');
var daterange = config.backtest.daterange;
var requiredHistory = config.tradingAdvisor.candleSize;

//https://en.wikipedia.org/wiki/NOP_(code)
var noop = require('node-noop').noop;
require('fs-extra').writeFile('noop.out',"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."+"Antoine de Saint-Exupery",noop);

var to = moment.utc(daterange.to);
var from = moment.utc(daterange.from).subtract(requiredHistory, 'm');

if(to <= from) util.die('This daterange does not make sense.')
if(!config.paperTrader.enabled) util.die('You need to enable the \"Paper Trader\" first to run a backtest.')

if(!from.isValid()) util.die('invalid `from`');

if(!to.isValid()) util.die('invalid `to`');

var Market = function() {
  _.bindAll(this,_.functions(this));
  this.pushing = false;
  this.ended = false;
  this.closed = false;
  Readable.call(this, {objectMode: true});

  log.write('');
  log.info('\t=================================================');
  log.info('\tWARNING: BACKTESTING FEATURE NEEDS PROPER TESTING');
  log.info('\tWARNING: ACT ON THESE NUMBERS AT YOUR OWN RISK!');
  log.info('\t=================================================');
  log.write('');

  this.reader = new Reader();


  log.debug('*** Requested', requiredHistory, 'minutes of warmup history data, so reading db since', from.format(), 'UTC', 'and start backtest at', daterange.from, 'UTC');

  this.batchSize = config.backtest.batchSize;
  this.iterator = {
    from: from.clone(),
    to: from.clone().add(this.batchSize, 'm').subtract(1, 's')
  }
}
util.makeEventEmitter(Market);


var Readable = require('stream').Readable;

Market.prototype = Object.create(Readable.prototype, {
  constructor: { value: Market }
});

Market.prototype.read = _.once(function() {
  this.get();
});

Market.prototype.get = function() {
  if(this.iterator.to >= to) {
    this.iterator.to = to;
    this.ended = true;
  }

  this.reader.get(
    this.iterator.from.unix(),
    this.iterator.to.unix(),
    'full',
    this.processCandles
  )
}

Market.prototype.processCandles = function(err, candles) {
  this.pushing = true;
  var amount = _.size(candles);

  if(amount === 0) {
    if(this.ended) {
      this.closed = true;
      this.reader.close();
      this.push({isFinished: true});
    } else {
      util.die('Query returned no candles (do you have local data for the specified range?)');
    }
  }

  if(!this.ended && amount < this.batchSize) {
    var d = function(ts) {
      return moment.unix(ts).utc().format('YYYY-MM-DD');
    }
    var from = d(_.first(candles).start);
    var to = d(_.last(candles).start);
    log.warn(`Simulation based on incomplete market data (${this.batchSize - amount} missing between ${from} and ${to}).`);
  }

  _.each(candles, function(c, i) {
    c.start = moment.unix(c.start);
    this.push(c);
  }, this);

  this.pushing = false;

  this.iterator = {
    from: this.iterator.from.clone().add(this.batchSize, 'm'),
    to: this.iterator.from.clone().add(this.batchSize * 2, 'm').subtract(1, 's')
  }

  if(!this.closed) {
    setTimeout(() => {
      this.get();
    }, 5);
  }
}

module.exports = Market;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
