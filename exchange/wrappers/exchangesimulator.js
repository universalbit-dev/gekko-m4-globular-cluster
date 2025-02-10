/*COPILOT ENHANCE 

To enhance the EXCHANGESIMULATOR function to calculate the price based on the BTC-LTC asset pair,
we can integrate price fetching from an external exchange API. 
Here is a potential enhancement to the EXCHANGESIMULATOR function:

Import the necessary modules (ccxt library)for fetching BTC-LTC prices.
Update the Trader function to fetch the latest BTC-LTC prices and use them in price calculations.

*/
const ccxt = require('ccxt'); // Import the ccxt library for exchange API
const moment = require('moment');
const _ = require('underscore');

const TREND_DURATION = 10;

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

const Trader = function() {
    this.name = 'ExchangeSimulator';
    this.at = moment().subtract(1, 's');
    this.price = 10;
    this.trend = 'up';
    this.tid = 0;
    this.exchange = new ccxt.kraken(); // Initialize the exchange instance
};

Trader.prototype.fetchLatestPrice = async function() {
    try {
        const ticker = await this.exchange.fetchTicker('LTC/BTC');
        this.price = ticker.last; // Update the price with the latest LTC-BTC price
    } catch (error) {
        console.error('Error fetching latest price:', error);
    }
};

Trader.prototype.getTrades = async function(since, cb) {
    await this.fetchLatestPrice(); // Fetch the latest price before generating trades
    const amount = moment().diff(this.at, 's');
    const trades = _.range(amount).map(() => {
        this.tid++;
        if (this.tid % TREND_DURATION === 0) {
            this.trend = (this.trend === 'up') ? 'down' : 'up';
        }
        if (this.trend === 'up') this.price += getRndInteger(0, 2);
        else this.price -= getRndInteger(0, 2);
        return {
            date: this.at.add(1, 'seconds').unix(),
            price: this.price,
            amount: Math.floor(Math.random() * 2),
            tid: this.tid
        };
    });
    console.log(`[EXCHANGE SIMULATOR] emitted ${amount} fake trades, up until ${this.at.format('YYYY-MM-DD HH:mm:ss')}.`);
    cb(null, trades);
};

Trader.getCapabilities = function() {
  return {
    name: 'ExchangeSimulator',
    slug: 'exchangesimulator',
    currencies: ['BTC'],
    assets: ['LTC'],
    maxTradesAge: 60,
    maxHistoryFetch: null,
    markets: [{ pair: ['BTC', 'LTC'], minimalOrder: { amount: 0.01, unit: 'assets' } }],
    requires: ['key', 'secret', 'username'],
    fetchTimespan: 60,
    tid: 'tid',
    tradable: false
  };
};

module.exports = Trader;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Disclaimer:
                              USE AT YOUR OWN RISK!
The author of this project and contributors are NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected
or specified. Please consider testing it first with paper trading and/or
backtesting on historical data. Also look at the code to see what how
it is working.
*/
