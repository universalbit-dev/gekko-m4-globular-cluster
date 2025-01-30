// wraps around a low level trigger and feeds
// it live market data.

const _ = require('lodash');

const exchangeUtils = require('./exchangeUtils');
const bindAll = exchangeUtils.bindAll;

const triggers = require('./triggers');

// @param api: a gekko broker wrapper instance
// @param type: type of trigger to wrap
// @param props: properties to feed to trigger
class Trigger {
  constructor({api, type, props, onTrigger}) {
    this.onTrigger = onTrigger;
    this.api = api;

    this.isLive = true;

    // note: we stay on the safe side and trigger
    // as soon as the bid goes below trail.
    this.tickerProp = 'bid';

    if(!_.has(triggers, type)) {
      throw new Error('Gekko Broker does not know trigger ' + type);
    }

    this.CHECK_INTERVAL = this.api.interval * 10;

    bindAll(this);
    this.trigger = new triggers[type]({
      onTrigger: this.propogateTrigger,
      ...props
    })

    this.scheduleFetch();
  }
  //COPILOT FIX
  scheduleFetch() {
    this.timeout = setTimeout(this.fetch.bind(this), this.CHECK_INTERVAL);
  }

  fetch() {
    if(!this.isLive) {
      return;
    }
    this.api.getTicker(this.processTicker.bind(this))
  }

  processTicker(err, ticker) {
    if(!this.isLive) {
      return;
    }
    
    if(err) {
      return console.log('[GB/trigger] failed to fetch ticker:', err);
    }

    this.price = ticker[this.tickerProp];

    this.trigger.updatePrice(this.price);
    this.scheduleFetch();
  }
  //COPILOT FIX
  cancel() {
    this.isLive = false;
    clearTimeout(this.timeout);
  }

  propogateTrigger(payload) {
    if(!this.isLive) {
      return;
    }
    this.isLive = false;
    this.onTrigger(payload);
  }
}

module.exports = Trigger;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

