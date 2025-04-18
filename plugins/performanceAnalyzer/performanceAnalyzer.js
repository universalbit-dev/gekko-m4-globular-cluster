const _ = require("underscore");
const {EventEmitter} = require("events");class Event extends EventEmitter{};
const moment = require('moment');
const statslite = require('stats-lite');
var util = require('../../core/util.js');
var config = util.getConfig();
const perfConfig = config.performanceAnalyzer;
const watchConfig = config.watch;

const dirs = util.dirs();
const ENV = util.gekkoEnv();
var log = require("../../core/log.js");
const fs=require("fs-extra");
const Logger = require('./logger');

const PerformanceAnalyzer = function() {
  _.bindAll(this,_.functions(this));
  EventEmitter.call(this);
  this.dates = {start: false,end: false};
  this.startPrice = 0;
  this.endPrice = 0;
  this.currency = watchConfig.currency;
  this.asset = watchConfig.asset;
  this.logger = new Logger(watchConfig);
  this.trades = 0;
  this.exposure = 0;
  this.roundTrips = [];
  this.losses = [];
  this.roundTrip = {id: 0,entry: false,exit: false};
  this.portfolio = {};
  this.balance;
  this.start = {};
  this.openRoundTrip = false;
  this.warmupCompleted = false;
}
util.makeEventEmitter(PerformanceAnalyzer);

PerformanceAnalyzer.prototype.processPortfolioValueChange = function(event) {
  if(!this.start.balance) {this.start.balance = event.balance;}
  this.balance = event.balance;
}

PerformanceAnalyzer.prototype.processPortfolioChange = function(event) {
  if(!this.start.portfolio) {
    this.start.portfolio = event;
  }
}

PerformanceAnalyzer.prototype.processStratWarmupCompleted = function() {
  this.warmupCompleted = true;
  this.processCandle(this.warmupCandle, _.noop);
}

PerformanceAnalyzer.prototype.processCandle = function(candle, done) {
  if(!this.warmupCompleted) {
    this.warmupCandle = candle;
    return done();
  }

  this.price = candle.close;
  this.dates.end = candle.start.clone().add(1, 'second');
  if(!this.dates.start) {
    this.dates.start = candle.start;
    this.startPrice = candle.close;
  }

  this.endPrice = candle.close;

  if(this.openRoundTrip) {
    this.emitRoundtripUpdate();
  }

  done();
}

PerformanceAnalyzer.prototype.emitRoundtripUpdate = function() {
  const uPnl = this.price - this.roundTrip.entry.price;

  this.deferredEmit('roundtripUpdate', {
    at: this.dates.end,
    duration: this.dates.end.diff(this.roundTrip.entry.date),
    uPnl,
    uProfit: uPnl / this.roundTrip.entry.total * 100
  })
}

PerformanceAnalyzer.prototype.processTradeCompleted = function(trade) {
  this.trades++;
  this.portfolio = trade.portfolio;
  this.balance = trade.balance;

  this.registerRoundtripPart(trade);

  const report = this.calculateReportStatistics();
  if(report) {
    this.logger.handleTrade(trade, report);
    this.deferredEmit('performanceReport', report);
  }
}

PerformanceAnalyzer.prototype.registerRoundtripPart = function(trade) {
  if(this.trades === 1 && trade.action === 'sell') {
    // this is not part of a valid roundtrip
    return;
  }

  if(trade.action === 'buy') {
    if (this.roundTrip.exit) {
      this.roundTrip.id++;
      this.roundTrip.exit = false
    }

    this.roundTrip.entry = {
      date: trade.date,
      price: trade.price,
      total: trade.portfolio.currency + (trade.portfolio.asset * trade.price),
    }
    this.openRoundTrip = true;
  } else if(trade.action === 'sell') {
    this.roundTrip.exit = {
      date: trade.date,
      price: trade.price,
      total: trade.portfolio.currency + (trade.portfolio.asset * trade.price),
    }
    this.openRoundTrip = false;

    this.handleCompletedRoundtrip();
  }
}

PerformanceAnalyzer.prototype.handleCompletedRoundtrip = function() {
  var roundtrip = {
    id: this.roundTrip.id,
    entryAt: this.roundTrip.entry.date,
    entryPrice: this.roundTrip.entry.price,
    entryBalance: this.roundTrip.entry.total,
    exitAt: this.roundTrip.exit.date,
    exitPrice: this.roundTrip.exit.price,
    exitBalance: this.roundTrip.exit.total,
    duration: this.roundTrip.exit.date.diff(this.roundTrip.entry.date)
  }

  roundtrip.pnl = roundtrip.exitBalance - roundtrip.entryBalance;
  roundtrip.profit = (100 * roundtrip.exitBalance / roundtrip.entryBalance) - 100;

  this.roundTrips[this.roundTrip.id] = roundtrip;

  this.logger.handleRoundtrip(roundtrip);

  this.deferredEmit('roundtrip', roundtrip);

  // update cached exposure
  this.exposure = this.exposure + Date.parse(this.roundTrip.exit.date) - Date.parse(this.roundTrip.entry.date);
  // track losses separately for downside report
  if (roundtrip.exitBalance < roundtrip.entryBalance)
    this.losses.push(roundtrip);

}

PerformanceAnalyzer.prototype.calculateReportStatistics = function() {
  if(!this.start.balance || !this.start.portfolio) {
    log.error('Cannot calculate a profit report without having received portfolio data.');
    log.error('Skipping performanceReport..');
    return false;
  }

  // the portfolio's balance is measured in {currency}
  const profit = this.balance - this.start.balance;

  const timespan = moment.duration(
    this.dates.end.diff(this.dates.start)
  );
  const relativeProfit = this.balance / this.start.balance * 100 - 100;
  const relativeYearlyProfit = relativeProfit / timespan.asYears();

  const percentExposure = this.exposure / (Date.parse(this.dates.end) - Date.parse(this.dates.start));

  const sharpe = (relativeYearlyProfit - perfConfig.riskFreeReturn)
    / statslite.stdev(this.roundTrips.map(r => r.profit))
    / Math.sqrt(this.trades / (this.trades - 2));

  const downside = statslite.percentile(this.losses.map(r => r.profit), 0.25)
    * Math.sqrt(this.trades / (this.trades - 2));

  const ratioRoundTrips = this.roundTrips.length > 0 ? (this.roundTrips.filter(roundTrip => roundTrip.pnl > 0 ).length / this.roundTrips.length * 100).toFixed(4) : 100;

  const report = {
    startTime: this.dates.start.utc().format('YYYY-MM-DD HH:mm:ss'),
    endTime: this.dates.end.utc().format('YYYY-MM-DD HH:mm:ss'),
    timespan: timespan.humanize(),
    market: this.endPrice * 100 / this.startPrice - 100,

    balance: this.balance,
    profit,
    relativeProfit: relativeProfit,
    yearlyProfit: profit / timespan.asYears(),
    relativeYearlyProfit,

    startPrice: this.startPrice,
    endPrice: this.endPrice,
    trades: this.trades,
    startBalance: this.start.balance,
    exposure: percentExposure,
    sharpe,
    downside,
    ratioRoundTrips
  }

  report.alpha = report.relativeProfit - report.market;

  return report;
}

PerformanceAnalyzer.prototype.finalize = function(done) {
  if(!this.trades) {
    return done();
  }

  const report = this.calculateReportStatistics();
  if(report) {
    const emit= new Event();
    this.logger.finalize(report);
    this.emit('performanceReport', report);
  }
  done();
}

module.exports = PerformanceAnalyzer;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
