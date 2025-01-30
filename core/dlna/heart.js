/*COPILOT EXPLAIN
The core/dlna/heart.js file defines a Heart class responsible for generating regular ticks, which trigger events and actions within the system. Here is a detailed explanation of its components:

    Imports and Initial Setup:
        Uses bluebird for promises and underscore for utility functions.
        Imports EventEmitter for event handling and several utility modules like util, log, and moment.
        Defines a constant TICKRATE set to 20 seconds.

    Heart Class:
        Constructor: Initializes the Heart instance, sets lastTick to false, and binds all functions to the instance using underscore.
        pump(): Logs a debug message and schedules the ticks by calling scheduleTicks().
        tick(): Checks if the last tick was too long ago (more than 5 times the TICKRATE). If so, it calls util.die() to terminate the process. Updates lastTick to the current time and emits a tick event.
        scheduleTicks(): Sets an interval to call tick() every TICKRATE seconds and defers the first tick to start immediately.

    Event Handling:
        Utilizes EventEmitter to emit tick events regularly, which other components can listen to and act upon.

The Heart class ensures regular, timed events within the system, allowing other components to perform actions in response to these ticks.
*/
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const { EventEmitter } = require("events");
var util = require('../util');
var config = util.getConfig();
var log = require('../log');
var moment = require('moment');
var TICKRATE = 20;

var Heart = function() {
  EventEmitter.call(this);
  this.lastTick = false;
  _.bindAll(this,_.functions(this));
}
util.makeEventEmitter(Heart);

Heart.prototype.pump = function() {
  log.debug('scheduling ticks');
  this.scheduleTicks();
}

Heart.prototype.tick = function() {
  if(this.lastTick) {
    if(this.lastTick < moment().unix() - TICKRATE * 5)
      util.die('Failed to tick in time', true);
  }

  this.lastTick = moment().unix();
  const emit = new EventEmitter();
  this.emit('tick');
}

Heart.prototype.scheduleTicks = function() {
  setInterval(
    this.tick,
    +moment.duration(TICKRATE, 's')
  );

  // start!
  _.defer(this.tick);
}

module.exports = Heart;

/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
