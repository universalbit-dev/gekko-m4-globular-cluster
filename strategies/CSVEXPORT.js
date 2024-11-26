/*
  Export data to .csv

	(CC-BY-SA 4.0) Rowan Griffin
	https://creativecommons.org/licenses/by-sa/4.0/

*/
require('../core/tulind');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
let _ = require('underscore');
let fs = require('fs-extra');

var method = {

  /* INIT */
  init: function() {

    this.name = 'CSVExport';
    this.requiredHistory = this.settings.historySize;
    this.startTime = new Date();
    this.debug = true;
  },
 
//general purpose log  {data}
update: function(candle) {
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + ' ' + this.startTime + '.csv', candle.high + "," + candle.low + "," + candle.close + "," + candle.volume + "," + candle.trades + "\n", function(err) {
      if (err) {return console.log(err);}
    });

  },

  /* CHECK */
  check: function() {_.noop;},
  /* END backtest */
  end: function() {_.noop;}

};

module.exports = method;
