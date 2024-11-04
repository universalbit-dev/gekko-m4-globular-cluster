const EventEmitter=require('node:events');
var Promise = require("bluebird");const _ = Promise.promisify(require("underscore"));
var moment = require('moment');
var utc = moment.utc;
var util = require('../util');
var dirs = util.dirs();
var config = util.getConfig();
var log = require(dirs.core + 'log');
var exchangeChecker = require(dirs.gekko + 'exchange/exchangeChecker');
var TradeBatcher = require(dirs.dlna + 'tradeBatcher');

var Fetcher = function(config) {
  EventEmitter.call(this);
  if(!_.isObject(config))throw new Error('TradeFetcher expects a config');

  var exchangeName = config.watch.exchange.toLowerCase();
  var DataProvider = require(util.dirs().gekko + 'exchange/wrappers/' + exchangeName);
  _.bindAll(this,_.functions(Fetcher.prototype));

// Create a public dataProvider object which can retrieve live
// trade information from an exchange.
  this.exchangeTrader = new DataProvider(config.watch);
  this.exchange = exchangeChecker.settings(config.watch);

  var requiredHistory = config.tradingAdvisor.candleSize * config.tradingAdvisor.historySize;
// If the trading adviser is enabled we might need a very specific fetch since
// to line up [local db, trading method, and fetching]
  if(config.tradingAdvisor.enabled && config.tradingAdvisor.firstFetchSince) {
    this.firstSince = config.tradingAdvisor.firstFetchSince;

    if(this.exchange.providesHistory === 'date') {
      this.firstSince = moment.unix(this.firstSince).utc();
    }
  }
  this.batcher = new TradeBatcher(this.exchange.tid);
  this.pair = [
    config.watch.asset,
    config.watch.currency
  ].join('/');

  //log.info('Starting to watch the market:',this.exchange.name,this.pair);
// if the exchange returns an error we will keep on retrying until next scheduled fetch.
  this.tries = 0;
  this.limit = 21;
  this.firstFetch = true;
  this.batcher.on('new batch', this.relayTrades);
}
 util.makeEventEmitter(Fetcher);util.inherit(Fetcher, EventEmitter);


Fetcher.prototype._fetch = function(since) {
  if(++this.tries >= this.limit)
    return;
  this.exchangeTrader.getTrades(since, this.processTrades, false);
}

Fetcher.prototype.fetch = function() {
  var since = false;
  if(this.firstFetch) {
    since = this.firstSince;
    this.firstFetch = false;
  } else
    since = false;

  this.tries = 0;
  //log.debug('Requested', this.pair, 'exchange data');
  this._fetch(since);
}

Fetcher.prototype.processTrades = function(err, trades) {
  if(err || _.isEmpty(trades)) {
    if(err) {
      log.warn(this.exchange.name, 'returned an error while fetching trades:', err);
      log.debug('refetching...');
    } else
      log.debug('Trade fetch came back empty, refetching...');
    setTimeout(this._fetch, +moment.duration('s', 34));
    return;
  }
  this.batcher.write(trades);
}

Fetcher.prototype.relayTrades = function(batch) {
  this.emit('trades batch', batch);
}
module.exports = Fetcher;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
