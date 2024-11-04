// Small plugin that subscribes to some events, stores
// them and sends it to the parent process.

const _ = require('underscore');
const log = require('../core/log');
const util = require('../core/util');
const dirs = util.dirs();
const env = util.gekkoEnv();
const config = util.getConfig();
const moment = require('moment');
const fs = require('fs-extra');
const EventEmitter = require('events');

const BacktestResultExporter = function() {
  _.bindAll(this, _.functions(BacktestResultExporter.prototype));
  EventEmitter.call(this);
  this.performanceReport;
  this.roundtrips = [];
  this.stratUpdates = [];
  this.stratCandles = [];
  this.trades = [];
  this.candleProps = config.backtestResultExporter.data.stratCandleProps;

  if(!config.backtestResultExporter.data.stratUpdates)this.processStratUpdate = null;
  if(!config.backtestResultExporter.data.roundtrips)this.processRoundtrip = null;
  if(!config.backtestResultExporter.data.stratCandles)this.processStratCandles = null;
  if(!config.backtestResultExporter.data.portfolioValues)this.processPortfolioValueChange = null;
  if(!config.backtestResultExporter.data.trades)this.processTradeCompleted = null;
  
}
util.makeEventEmitter(BacktestResultExporter);util.inherit(BacktestResultExporter, EventEmitter);


BacktestResultExporter.prototype.processPortfolioValueChange = function(portfolio) {
  this.portfolioValue = portfolio.balance;
}

BacktestResultExporter.prototype.processStratCandle = function(candle) {
  let strippedCandle;

  if(!this.candleProps) {
    strippedCandle = {
      ...candle,
      start: candle.start.unix()
    }
  } else {
    strippedCandle = {
      ..._.pick(candle, this.candleProps),
      start: candle.start.unix()
    }
  }

  if(config.backtestResultExporter.data.portfolioValues)strippedCandle.portfolioValue = this.portfolioValue;

  this.stratCandles.push(strippedCandle);
};

BacktestResultExporter.prototype.processRoundtrip = function(roundtrip) {
  this.roundtrips.push({
    ...roundtrip,
    entryAt: roundtrip.entryAt.unix(),
    exitAt: roundtrip.exitAt.unix()
  });
};

BacktestResultExporter.prototype.processTradeCompleted = function(trade) {
  this.trades.push({
    ...trade,
    date: trade.date.unix()
  });
};

BacktestResultExporter.prototype.processStratUpdate = function(stratUpdate) {
  this.stratUpdates.push({
    ...stratUpdate,
    date: stratUpdate.date.unix()
  });
}

BacktestResultExporter.prototype.processPerformanceReport = function(performanceReport) {this.performanceReport = performanceReport;}

BacktestResultExporter.prototype.finalize = function(done) {
  const backtest = {
    market: config.watch,
    tradingAdvisor: config.tradingAdvisor,
    strategyParameters: config[config.tradingAdvisor.method],
    performanceReport: this.performanceReport
  };

  if(config.backtestResultExporter.data.stratUpdates)backtest.stratUpdates = this.stratUpdates;
  if(config.backtestResultExporter.data.roundtrips)backtest.roundtrips = this.roundtrips;
  if(config.backtestResultExporter.data.stratCandles)backtest.stratCandles = this.stratCandles;
  if(config.backtestResultExporter.data.trades)backtest.trades = this.trades;
  if(env === 'child-process') {process.send({backtest});}
  if(config.backtestResultExporter.writeToDisk) {this.writeToDisk(backtest, done);}
  else {done();}
};

BacktestResultExporter.prototype.writeToDisk = function(backtest, next) {
  let filename;

  if(config.backtestResultExporter.filename) {filename = config.backtestResultExporter.filename;}
  else {const now = moment().format('YYYY-MM-DD HH:mm:ss');filename = `backtest-${config.tradingAdvisor.method}-${now}.json`;}
  fs.writeFile('logs/json/' + filename,JSON.stringify(backtest),
    err => {
      if(err) {log.error('unable to write backtest result', err);}
      else {log.info('written backtest to: ', 'logs/json/' + filename);}
      next();
    }
  );

var obj = {dev: filename};
var backtest_file= {};
var value=filename;
async.forEachOf(obj, (value, key, callback) => {
    fs.readFile("logs/json/" + value, "utf8", (err, data) => {
        if (err) return callback(err);
        try {backtest_file[key] = JSON.parse(data);}
        catch (e) {return callback(e);}
        callback();
    });
}, err => {
    if (err) console.error(err.message);
    //backtest_file is now a map of JSON data
});
}

module.exports = BacktestResultExporter;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
