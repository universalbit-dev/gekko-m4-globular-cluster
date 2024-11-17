/*  */
const EventEmitter  = require('node:events'); 
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
var moment = require('moment');
const fs = Promise.promisifyAll(require("node:fs"));
var util = require('../../core/util');
var dirs = util.dirs();
var config = require('../../core/util.js').getConfig();
var log = require('../../core/log');
var CandleCreator = require('./candleCreator.js');
var Manager = function(candle) {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(Manager.prototype));
  this.candleCreator = new CandleCreator;
  this.candleCreator
  .on('candles', this.relayCandles);
};
util.makeEventEmitter(Manager);util.inherit(Manager, EventEmitter);

Manager.prototype.processTrades = function(tradeBatch) {this.candleCreator.write(tradeBatch);}
Manager.prototype.relayCandles = function(candles) {this.emit('candles', candles);}
module.exports = Manager;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
