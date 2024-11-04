var Promise = require("bluebird");const _ = Promise.promisify(require("underscore"));
const EventEmitter= require('node:events'); 
var util = require('../util');
var config = util.getConfig();
var log = require('../log');
var moment = require('moment');
var TICKRATE = config.watch.tickrate;

var Heart = function() {
  EventEmitter.call(this);
  this.lastTick = false;
  _.bindAll(this, _.functions(Heart.prototype));
}
util.makeEventEmitter(Heart);util.inherit(Heart, EventEmitter);

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
