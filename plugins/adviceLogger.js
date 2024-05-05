
const _ = require('../core/lodash3');require('lodash-migrate');
const makeEventEmitter = require('node:events');
var log = require('../core/log');
util = require('../core/util');
config = util.getConfig();
moment = require('moment');

adviceLoggerConfig = config.adviceLogger;

var Actor = function() {
  this.price = 'N/A';
  this.marketTime = {format: function() {return 'N/A'}};
  _.bindAll(this,_.functions(this));
}
util.makeEventEmitter(Actor);


Actor.prototype.processCandle = function(candle, done) {
  this.price = candle.close;
  this.marketTime = candle.start;
  done();
};

Actor.prototype.processAdvice = function(advice) {
  if (adviceLoggerConfig.muteSoft && advice.recommendation == 'soft') return;
  console.log();
  log.info('We have new trading advice!');
  log.info('\t Position:', advice.recommendation);
  log.info('\t Market price:', this.price);
  log.info('\t Based on market time:', this.marketTime.format('YYYY-MM-DD HH:mm:ss'));
  console.log();
};

Actor.prototype.finalize = function(advice, done) {done();};
module.exports = Actor;
