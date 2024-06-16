// Fake exchanges: used to test purposes to develop Gekko-M4 (works without internet).
const _ = require('lodash');
const moment = require('moment');

const TREND_DURATION = 1000;

const Trader = function() {
  this.name = 'ExchangeSimulator';

  this.at = moment().subtract(1, 'minutes');
  // fake data
  this.price = 100;
  this.trend = 'up';
  this.tid = 0;
}

Trader.prototype.getTrades = function(since, cb) {
  const amount = moment().diff(this.at, 'seconds');
  const trades = _.range(amount).map(() => {
  this.tid++;
  
  if(this.tid % TREND_DURATION === 0) {
  if(this.trend === 'up')this.trend = 'down';
  else this.trend = 'up';
  }
  
  if(this.trend === 'up')this.price += Math.random()*10;
  else this.price -= Math.random()*10;
  return {
  date: this.at.add(1, 'seconds').unix(),
  price: this.price,
  amount: Math.floor(Math.random() * 100),
  tid: this.tid
  }
  
  });
  console.log(`[EXCHANGE SIMULATOR] emitted ${amount} fake trades, up until ${this.at.format('YYYY-MM-DD HH:mm:ss')}.`);
  cb(null, trades);
}

Trader.getCapabilities = function(){
  return {
    name: 'ExchangeSimulator',
    slug: 'exchangesimulator',
    currencies: ['BTC'],
    assets: ['LTC'],
    maxTradesAge: 60,
    maxHistoryFetch: null,
    markets: [{ pair: ['BTC', 'LTC'], minimalOrder: { amount: 0.01, unit: 'assets' } },],
    requires: ['key', 'secret', 'username'],
    fetchTimespan: 60,
    tid: 'tid',
    tradable: false
  };
}

module.exports = Trader;

/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Disclaimer:
                              USE AT YOUR OWN RISK!
The author of this project is NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected
or specified. Please consider testing it first with paper trading and/or
backtesting on historical data. Also look at the code to see what how
it is working.

*/
