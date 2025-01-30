/* COPILOT EXPLAIN
The core/dlna/dlna.js file is responsible for managing data flow and events within the Gekko trading bot. Here is an overview of its components:

    Imports and Initial Setup:
        Uses bluebird for promises and underscore for utility functions.
        Imports EventEmitter for event handling and several utility files.

    Internal Modules:
        Heart: Manages the timing of events and triggers.
        MarketDataProvider: Fetches market data.
        CandleManager: Processes trade data into candles.

    Dlna Class:
        Constructor: Initializes internal modules and sets up event relays.
            Relays marketUpdate and marketStart events from MarketDataProvider.
            Outputs candles from CandleManager.
            Retrieves trade data on every tick using Heart.
            Processes trade data into candles using CandleManager.
            Starts the Heart to begin the event cycle.
        pushCandles(candles): Pushes new candles to the stream.
        _read(): A no-operation function required for the Readable stream.

    Event Handling:
        Utilizes EventEmitter to relay and handle various events related to market data and trade processing.

The file sets up a flow where market data is fetched, processed into candles, and then relayed to other components or systems. This ensures real-time data processing and event-driven architecture within the Gekko trading bot.

*/

//https://github.com/petkaantonov/bluebird/blob/2.x/API.md#promisification
var Promise = require("bluebird");
const _ = Promise.promisifyAll(require("underscore"));
const {EventEmitter} = require("events");

var util = require('../util');
var config = require('../util.js').getConfig();

var Heart =  require('./heart.js');
var MarketDataProvider = require('./marketDataProvider.js');
var CandleManager =require('./candleManager.js');

var Dlna = function(config) {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(this));
  Readable.call(this, {objectMode: true});
//Dlna internal modules:
  this.heart = new Heart;
  this.marketDataProvider = new MarketDataProvider(config);
  this.candleManager = new CandleManager;
//Dlna data flow:
// relay a marketUpdate event
  this.marketDataProvider.on('marketUpdate',e => this.emit('marketUpdate', e));
// relay a marketStart event
  this.marketDataProvider.on('marketStart',e => this.emit('marketStart', e));
// Output the candles
  this.candleManager.on('candles',this.pushCandles);
// on every `tick` retrieve trade data
  this.heart.on('tick',this.marketDataProvider.retrieve);
// on new trade data create candles
  this.marketDataProvider.on('trades',this.candleManager.processTrades);
  this.heart.pump();
}
util.makeEventEmitter(Dlna); 

var Readable = require('stream').Readable;
Dlna.prototype = Object.create(Readable.prototype, {constructor: { value: Dlna }});
Dlna.prototype._read = function noop() {};
Dlna.prototype.pushCandles = function(candles) {_.each(candles, this.push);};
module.exports = Dlna;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
