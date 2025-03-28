/* copilot explain

The file dlna.js defines a Dlna class which extends the Readable stream and uses various modules to manage market data and create candles. Here's a breakdown:

    Dependencies: The code imports several modules: underscore, events, util, Heart, MarketDataProvider, and CandleManager.
    
    Dlna Constructor:
        Binds all functions to the instance using _.bindAll.
        Initializes internal modules (Heart, MarketDataProvider, CandleManager).
        Sets up event listeners to relay market events (marketUpdate and marketStart).
        Outputs candles through candleManager.
        Retrieves trade data on every tick from heart.
        Processes trades to create candles.
        
    Stream Implementation:
        Extends Readable stream.
        Implements a no-operation _read function.
        Defines pushCandles to push candles data to the stream.
*/

const _ = require("underscore");
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
