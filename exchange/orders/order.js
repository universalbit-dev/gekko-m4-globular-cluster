const {EventEmitter}=require('node:events');
const _ = require('../../core/lodash');
const exchangeUtils = require('../exchangeUtils');
const isValidOrder = exchangeUtils.isValidOrder;
const states = require('./states');
const util = require('../../core/util');
const config = util.getConfig();
const bindAll = exchangeUtils.bindAll;
var checkinterval=config.api.interval;
//base order
class BaseOrder extends EventEmitter {
  constructor(api) {
    super();
    this.api = api;
    this.checkInterval = checkinterval;
    this.status = states.INITIALIZING;
    this.completed = false;
    this.completing = false;
    bindAll(this);
  }

  submit({side, amount, price, alreadyFilled}) {
    const check = isValidOrder({
      market: this.market,
      api: this.api,
      amount,
      price
    });

    if(!check.valid) {
      if(alreadyFilled) {
        // partially filled, but the remainder is too small.
        return this.filled();
      }
      this.emit('invalidOrder', check.reason);
      this.rejected(check.reason);
    }

    this.api[this.side](amount, this.price, this.handleCreate);
  }

  setData(data) {
    this.data = data;
  }

  emitStatus() {
    this.emit('statusChange', this.status);
  }

  cancelled() {
    this.status = states.CANCELLED;
    this.emitStatus();
    this.completed = true;
    this.finish();
  }

  rejected(reason) {
    this.rejectedReason = reason;
    this.status = states.REJECTED;
    this.emitStatus();
    console.log(new Date, 'sticky rejected', reason)
    this.finish();
  }

  filled(price) {
    this.status = states.FILLED;
    this.emitStatus();
    this.completed = true;
    console.log(new Date, 'sticky filled')
    this.finish(true);
  }

  finish(filled) {
    this.completed = true;
    this.emit('completed', {
      status: this.status,
      filled
    })
  }
}

module.exports = BaseOrder;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
