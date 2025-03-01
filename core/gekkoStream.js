/* CODEPILOT EXPLAIN
This JavaScript file defines a class Gekko that extends the Writable stream class to process and handle financial data in the form of "candles". Here's a detailed explanation:

    Dependencies: The script imports several libraries like Promise, underscore, stream, async, moment, and events. It also imports some utility functions from a local util module.

    Gekko Class:
        The Gekko class extends EventEmitter and Writable. It initializes with an array of plugins and determines which plugins process candles and which emit events.
        The constructor binds the finalize method and all other methods to the instance using underscore.

    _write Method:
        This method is overridden to handle incoming data chunks (candles).
        Depending on the configuration (config.debug and mode), it either logs if a candle is not processed within 0.987 seconds or just processes the candle.
        It uses underscore's after function to ensure all candle consumers process the candle before calling _done.

    flushDefferedEvents Method: This method ensures all deferred events from producers are broadcasted.

    finalize Method: This method finalizes the processing by finding the 'Trading Advisor' plugin and calling its finish method, which in turn calls shutdown.

    shutdown Method: This method ends the stream, iterates over all plugins to call their finalize method (if they have one), and then exits the process.

    Module Exports: The Gekko class is exported as a module.

    License: The file includes an MIT License disclaimer.

In summary, this script sets up a stream-based processing system for financial candles, using plugins to handle the actual data processing and event handling.
*/
const _ = require("underscore");
var Writable = require('stream').Writable;

var async = require('async');
var moment = require('moment');
const {EventEmitter}=require("events");

var util = require('./util');
var env = util.gekkoEnv();
var mode = util.gekkoMode();
var config = util.getConfig();
var log = require(util.dirs().core + 'log');

var Gekko = function(plugins) {
  EventEmitter.call(this);
  this.plugins = plugins;
  this.candleConsumers = plugins
  .filter(plugin => plugin.processCandle);
  Writable.call(this, {objectMode: true});
  this.producers = this.plugins
  .filter(p => p.meta.emits);
  this.finalize = _.bind(this.finalize, this);
  _.bindAll(this, _.functions(this));
}
util.makeEventEmitter(Gekko);

Gekko.prototype = Object.create(Writable.prototype, {constructor: { value: Gekko }});

if(config.debug && mode !== 'importer') {

Gekko.prototype._write = function(chunk, encoding, _done) {
    if(chunk.isFinished) {return this.finalize();}
    const start = moment();
    var relayed = false;var at = null;
    
    const timer = setTimeout(() => {
      if(!relayed)
        log.error([
          `The plugin "${at}" has not processed a candle for 0.987 second.`,
          `This will cause Gekko to slow down or stop working completely.`
        ].join(' '));
    }, 987);

    const flushEvents = _.after(this.candleConsumers.length, () => {
      relayed = true;
      clearInterval(timer);
      this.flushDefferedEvents();
      _done();
    });
    _.each(this.candleConsumers, function(c) {
      at = c.meta.name;
      c.processCandle(chunk, flushEvents);
    }, this);
  }
} else {
  Gekko.prototype._write = function(chunk, encoding, _done) {
    if(chunk.isFinished) {
      return this.finalize();
    }
    const flushEvents = _.after(this.candleConsumers.length, () => {
      this.flushDefferedEvents();
      _done();
    });
    _.each(this.candleConsumers, function(c) {
      c.processCandle(chunk, flushEvents);
    }, this);
  }
}

Gekko.prototype.flushDefferedEvents = function() {
  const broadcasted = _.find(
    this.producers,
    producer => producer.broadcastDeferredEmit()
  );
  if(broadcasted)
    this.flushDefferedEvents();
}

Gekko.prototype.finalize = function() {
  var tradingMethod = _.find(
    this.candleConsumers,
    c => c.meta.name === 'Trading Advisor'
  );

  if(!tradingMethod)
    return this.shutdown();

  tradingMethod.finish(this.shutdown.bind(this));
}

Gekko.prototype.shutdown = function() {
  this.end();
  async.eachSeries(
    this.plugins,
    function(c, callback) {
      if (c.finalize) c.finalize(callback);
      else callback();
    },
    () => {
      if (env === 'child-process') process.send('done');
      else process.exit(0);
    }
  );
};

module.exports = Gekko;
/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
