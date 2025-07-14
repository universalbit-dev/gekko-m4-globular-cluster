/*
  gekkoStream.js - Gekko Streaming Pipeline Implementation

  This module implements the Gekko core as a Writable stream and event emitter,
  orchestrating the flow of trading candle data through configured plugins.

  Main Responsibilities:
    - Loads and manages plugins for trading, analysis, and event logging.
    - Processes candle data in a streaming, asynchronous fashion.
    - Handles plugin event broadcasting and deferred event flushing.
    - Implements robust shutdown and finalization logic for plugins.
    - Provides debugging and error logging for plugin execution delays.

  Usage:
    - Instantiate GekkoStream with an array of plugin objects.
    - Pipe candle/trading data into the instance for automated processing.
    - Plugins are initialized and managed automatically.

  Customization:
    - Extend plugins by adding 'processCandle', 'meta', or 'broadcastDeferredEmit' methods.
    - Update plugin definitions to support new trading strategies or data sources.
*/
require('dotenv').config();
const _ = require("underscore");
var Writable = require('stream').Writable;

var async = require('async');
var moment = require('moment');
const {EventEmitter}=require("events");

var util = require('./util');
var env = process.env.GEKKO_ENV || 'standalone';
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
MIT License

Permission is hereby granted, free of charge, to use, copy, modify, and distribute this software, subject to the inclusion of this notice.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
*/
