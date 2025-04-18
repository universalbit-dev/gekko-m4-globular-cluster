/* copilot explain

Imports and Initial Setup:

    Various modules are imported, including underscore for utility functions, EventEmitter for event handling, moment for date manipulation, fs-extra for file operations.
    Internal modules log and CandleCreator are also imported.

Manager Class:

    Constructor (Manager(candle)): Initializes the Manager instance. It extends EventEmitter, binds all functions to the instance using underscore, and sets up a CandleCreator instance.
    The CandleCreator instance listens for candles events and calls the relayCandles method.
    
    processTrades(tradeBatch): Processes a batch of trades by writing them to the CandleCreator instance.
    relayCandles(candles): Emits a candles event with the processed candles.

Event Handling:

    The class extends EventEmitter to emit events, allowing other components to listen and react to new candles.
    This class coordinates the processing of trade data into candles and relays the resulting candles through events.
*/
const _ =require("underscore");
const { EventEmitter } = require("events");
var moment = require('moment');
const fs = require("fs-extra");
var util = require('../util.js');
var dirs = util.dirs();
var config = util.getConfig();
var log = require('../log.js');
var CandleCreator = require('./candleCreator.js');

var Manager = function(candle) {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(this));
  this.candleCreator = new CandleCreator;
  this.candleCreator
  .on('candles', this.relayCandles);
};
util.makeEventEmitter(Manager);util.inherit(Event, Manager);

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
