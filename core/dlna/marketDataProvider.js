/* copilot explain

Imports and Initial Setup:

    Various modules are imported, including underscore for utility functions, EventEmitter for event handling, and util for utility functions.
    MarketFetcher is imported for fetching market trade data. config is set up by requiring util.js and calling its getConfig method.

Manager Class:

    Constructor (Manager(config)): Initializes the Manager instance with a configuration object. 
    It binds all functions to the instance using underscore, sets up a MarketFetcher instance to fetch trades, and sets up event handling to relay newly fetched trades.
    
    retrieve(): Calls the fetch method of the MarketFetcher instance to retrieve market trades.
    relayTrades(batch): Handles the relay of trade batches. It calls sendMarketStart once for the first batch, emits a marketUpdate event with the date of the last trade in the batch,
    and emits a trades event with the entire batch.
    
    sendMarketStart(batch): Emits a marketStart event with the date of the first trade in the batch. This method is wrapped in _.once to ensure it is only called once.

Event Handling:

    The class extends EventEmitter to emit events, allowing other components to listen and react to new trade batches and market updates.
    This class ensures that market trade data is fetched, processed, and emitted as events for other components to handle.
*/

const _ = require("underscore");
const { EventEmitter } = require("events");
var util = require('../util');
var config = require('../util.js').getConfig();
var MarketFetcher = require("./marketFetcher");
var dirs = util.dirs();

var Manager = function(config) {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(this));
// fetch trades
  this.source = new MarketFetcher(config);
// relay newly fetched trades
  this.source
    .on('trades batch', this.relayTrades);
}
util.makeEventEmitter(Manager);util.inherit(Event, Manager);
// HANDLERS
Manager.prototype.retrieve = function() {
  this.source.fetch();
}

Manager.prototype.relayTrades = function(batch) {
  this.sendMarketStart(batch);
  this.emit('marketUpdate', batch.last.date);

  this.emit('trades', batch);
}

Manager.prototype.sendMarketStart = _.once(function(batch) {
  this.emit('marketStart', batch.first.date);
});

module.exports = Manager;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
