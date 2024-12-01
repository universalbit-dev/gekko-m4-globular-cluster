
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const {EventEmitter} = require("events");
var log = require('../core/log');
const util = require('../core/util');const config = util.getConfig();
const moment = require('moment');
const adviceLoggerConfig = config.adviceLogger;
const fs= require("fs-extra");

var Actor = function() {
  EventEmitter.call(this);
  this.price = 'N/A';
  this.marketTime = {format: function() {return 'N/A'}};
  _.bindAll(this, _.functions(this));
}
util.makeEventEmitter(Actor);util.inherit(Actor, EventEmitter);

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

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
