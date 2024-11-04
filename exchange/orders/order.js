const EventEmitter = require('node:events');
const base = new EventEmitter();
const _ = require('lodash');
const util=require('../../core/util');
const exchangeUtils = require('../exchangeUtils');
const bindAll = exchangeUtils.bindAll;
const isValidOrder = exchangeUtils.isValidOrder;
const states = require('./states');

// base order

class BaseOrder extends EventEmitter {
  constructor(api) {
    super(this);
    EventEmitter.call(this);
    this.api = api;

    this.checkInterval = api.interval || 1500;
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
        // partially filled, but the remainder is too
        // small.
        return this.filled();
      }

      base.emit('invalidOrder', check.reason);
      this.rejected(check.reason);
    }

    this.api[this.side](amount, this.price, this.handleCreate);
  }

  setData(data) {
    this.data = data;
  }

  emitStatus() {
    base.emit('statusChange', this.status);
  }

  cancelled() {
    this.status = states.CANCELLED;
    base.emitStatus();
    this.completed = true;
    this.finish();
  }

  rejected(reason) {
    this.rejectedReason = reason;
    this.status = states.REJECTED;
    base.emitStatus();
    console.log(new Date, 'sticky rejected', reason)
    this.finish();
  }

  filled(price) {
    this.status = states.FILLED;
    base.emitStatus();
    this.completed = true;
    console.log(new Date, 'sticky filled')
    this.finish(true);
  }

  finish(filled) {
    this.completed = true;
    base.emit('completed', {status: this.status,filled})
  }
  
}
util.makeEventEmitter(BaseOrder);util.inherit(BaseOrder, EventEmitter);

module.exports = BaseOrder;
