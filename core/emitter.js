const util = require('node:util');
const events = require('node:events');//
const NativeEventEmitter = events.EventEmitter;

const GekkoEventEmitter = function() {
  NativeEventEmitter.call(this);
  this.defferedEvents = [];
}

util.inherits(GekkoEventEmitter, NativeEventEmitter);

GekkoEventEmitter.prototype.deferredEmit = function(name, payload) {
  this.defferedEvents.push({name, payload});
}

GekkoEventEmitter.prototype.broadcastDeferredEmit = function() {
  if(this.defferedEvents.length === 0)
    return false;
  const emit=new events();
  const event = this.defferedEvents.shift();//
  this.emit(event.name, event.payload);
  
  return true;
}

module.exports = GekkoEventEmitter;

/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
