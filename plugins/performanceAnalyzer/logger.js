// log trade performance results
const EventEmitter = require('events');
const _ = require('underscore');
const moment = require('moment');
const humanizeDuration = require('humanize-duration');
var log = require('../../core/log.js');
const util = require('../../core/util.js');
var config = util.getConfig();
const dirs = util.dirs();
const mode = util.gekkoMode();

const Logger = function(watchConfig) {
  _.bindAll(this,_.functions(Logger.prototype));
  EventEmitter.call(this);
  this.currency = watchConfig.currency;
  this.asset = watchConfig.asset;
  this.roundtrips = [];
  
}
util.makeEventEmitter(Logger);util.inherit(Logger, EventEmitter);


Logger.prototype.round = function(amount) {
  return amount.toFixed(8);
}

// used for:
// - realtime logging (per advice)
// - backtest logging (on finalize)
Logger.prototype.logReport = function(trade, report) {
  // ignore the trade

  var start = this.round(report.startBalance);
  var current = this.round(report.balance);

  log.info(`original balance:\t\t ${start} ${this.currency}`);
  log.info(`current balance:\t\t ${current} ${this.currency}`);
  log.info(
    `profit:\t\t\t\t ${this.round(report.profit)} ${this.currency}`,
    `(${this.round(report.relativeProfit)}%)`
  );
}

Logger.prototype.logRoundtripHeading = function() {
  log.info('', 'entry date (UTC)  \texit date (UTC)  \texposed duration\tP&L \tprofit');
}

Logger.prototype.logRoundtrip = function(rt) {
  const display = [
    rt.entryAt.utc().format('YYYY-MM-DD HH:mm'),
    rt.exitAt.utc().format('YYYY-MM-DD HH:mm'),
    (moment.duration(rt.duration).humanize() + "           ").slice(0, 16),
    rt.pnl.toFixed(2),
    rt.profit.toFixed(2)
  ];

  log.info('', display.join('\t'));
}

if(mode === 'backtest') {
  Logger.prototype.handleTrade = function(trade) {
    if(trade.action !== 'sell' && trade.action !== 'buy')
      return;

    var at = trade.date.format('YYYY-MM-DD HH:mm:ss');


    if(trade.action === 'sell')

        log.info(
          `${at}: Paper trader simulated a SELL`,
          `\t${this.round(trade.portfolio.currency)}`,
          `${this.currency} <= ${this.round(trade.portfolio.asset)}`,
          `${this.asset}`
        );

    else if(trade.action === 'buy')

      log.info(
        `${at}: Paper trader simulated a BUY`,
        `\t${this.round(trade.portfolio.currency)}`,
        `${this.currency}\t=> ${this.round(trade.portfolio.asset)}`,
        `${this.asset}`
      );
  }

  Logger.prototype.finalize = function(report) {

    log.write('');
    log.info('\t=================================================');
    log.info('\tBACKTESTING FEATURE NEEDS PROPER TESTING');
    log.info('\tACT ON THESE NUMBERS AT YOUR OWN RISK!');
    log.info('\t=================================================');
    log.write('');

    log.info();
    log.info('REPORT:');

    this.logRoundtripHeading();
    _.each(this.roundtrips, this.logRoundtrip, this);

    log.info()
    log.info(`start time:\t\t\t ${report.startTime}`);
    log.info(`end time:\t\t\t ${report.endTime}`);
    log.info(`timespan:\t\t\t ${report.timespan}`);
    log.info(`exposure:\t\t\t ${report.exposure}`);
    log.info();
    log.info(`start price:\t\t\t ${report.startPrice} ${this.currency}`);
    log.info(`end price:\t\t\t ${report.endPrice} ${this.currency}`);
    log.info(`Market:\t\t\t\t ${this.round(report.market)}%`);
    log.info();
    log.info(`amount of trades:\t\t ${report.trades}`);

    this.logReport(null, report);

    log.info(
      `simulated yearly profit:\t ${report.yearlyProfit}`,
      `${this.currency} (${report.relativeYearlyProfit}%)`
    );

    log.info(`sharpe ratio:\t\t\t ${report.sharpe}`);
    log.info(`expected downside:\t\t ${report.downside}`);
    log.info(`ratio roundtrips:\t\t ${report.ratioRoundTrips}%`);
  }

  Logger.prototype.handleRoundtrip = function(rt) {
    this.roundtrips.push(rt);
  }

} else if(mode === 'realtime') {
  Logger.prototype.handleTrade = Logger.prototype.logReport;

  Logger.prototype.handleRoundtrip = function(rt) {
    this.logRoundtripHeading();
    this.logRoundtrip(rt);
  }

}

module.exports = Logger;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
