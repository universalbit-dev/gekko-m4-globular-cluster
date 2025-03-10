/* copilot explain
Imports and Initial Setup:

    Various modules are imported, including underscore for utility functions, EventEmitter for event handling, util and log for utility and logging functions, and moment for date and 
    time manipulation.
    A constant TICKRATE is set to 20 seconds, defining the interval between ticks.

Heart Class:

    Constructor (Heart): Initializes the Heart instance. It extends EventEmitter, initializes lastTick to false, and binds all methods to the instance using underscore.
    pump(): Logs a debug message and calls scheduleTicks() to start scheduling ticks.
    tick(): Checks if the last tick was more than 5 times the TICKRATE ago. If so, it calls util.die() to terminate the process with an error message. 
    It updates lastTick to the current time and emits a tick event.
    scheduleTicks(): Sets an interval to call tick() every TICKRATE seconds and defers the first tick to start immediately.

Event Handling:

    The class extends EventEmitter to emit tick events regularly, allowing other components to perform actions in response to these ticks.
*/
const _ =require("underscore");
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
  try {
    if (this.lastTick) {
      if (this.lastTick < moment().unix() - TICKRATE * 5) {
        util.die('Failed to tick in time', true);
      }
    }
    this.lastTick = moment().unix();
    this.emit('tick');
  } catch (error) {
    log.error('Error during tick:', error);
    // Additional error handling logic here
  }
};


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
