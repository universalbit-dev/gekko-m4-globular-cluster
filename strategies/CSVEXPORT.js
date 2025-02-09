/*
  Export data to file .csv 
  (CC-BY-SA 4.0) Rowan Griffin
  https://creativecommons.org/licenses/by-sa/4.0/
*/
require('dotenv').config();
const ccxt = require("ccxt");
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
let _ = require('../core/lodash');
let fs = require('fs-extra');fs.createReadStream('/dev/null');
var Wrapper = require('../strategyWrapperRules.js');
var method = Wrapper;
var id = process.env.exchangeId; /* Exchange Name */
//ccxt histogram variables
var candle_open=0.00;var candle_high=0.00;var candle_low=0.00;var candle_close=0.00;var candle_volume=0.00;
var exchange = new ccxt[id] ({
        verbose: false,
        apiKey: process.env.key || '',
        secret: process.env.secret || '',
    });
    
/* INIT */
  method.init = function() {
    this.name = 'CSVEXPORT';
    this.requiredHistory = this.settings.historySize;
    this.startTime = new Date();
    this.debug = true;
  },
 
//General Purpose Log  {data}
  method.update = function(candle) {
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + ' ' + this.startTime + '.csv', candle.high + "," + candle.low + "," + candle.close + "," +
    candle.volume + "," + candle.trades + "\n", function(err) 
    {if (err) {return console.log(err);}});
  },
	  
/* CHECK */
  method.check = function() {_.noop;},
	  
/* END backtest */
  method.end = function() {_.noop;}
  module.exports = method;
