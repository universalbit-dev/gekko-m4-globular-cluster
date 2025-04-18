/* */
const moment = require('moment');const _ = require('underscore');

var fibonacci_sequence = ['0', '1', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '144', '233', '377', '610', '987', '1597', '2584', '4181', '6765'];
var fibonacci_number = Math.floor(Math.random() * fibonacci_sequence.length);
const TREND_DURATION = fibonacci_number;

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CandleCreator = function() {};
CandleCreator.prototype.calculateCandle = function(trades) {
  const open = trades[0].price;
  const close = trades[trades.length - 1].price;
  const high = Math.max(...trades.map(t => t.price));
  const low = Math.min(...trades.map(t => t.price));
  const volume = trades.reduce((acc, t) => acc + t.amount, 0);
  const vwp = trades.reduce((acc, t) => acc + (t.price * t.amount), 0) / volume;

  return { open, high, low, close, vwp, volume };
};

const Trader = function(initialPrice = 10, initialTrend = 'up') {
    this.name = 'ExchangeSimulator';
    this.at = moment().subtract(1, 's');
    this.price = initialPrice;
    this.trend = initialTrend;
    this.tid = 0;
    this.candleHistory = [];
};


Trader.prototype.fetchLatestPrice = async function() {
    try {
        // Wait until the first fake trade has been emitted
        while (!firstTradeEmitted) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
        }

        // Simulate fetching the latest price
        const priceChange = getRndInteger(-2, 2);
        this.price = this.price + priceChange;

        // Validate the new price
        if (isNaN(this.price)) {
            throw new Error('Price calculation resulted in NaN');
        }
    } catch (error) {
        console.error('Error fetching latest price:', error);
        this.price = 10; // Reset to a default value if NaN error occurs
        this.manageFetchError(error);
    }
};

Trader.prototype.manageFetchError = function(error) {
    // Log the error to a monitoring service, send an alert, etc.
    console.log('Managing fetch error:', error.message);
    // Additional error handling logic can be added here
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

Trader.prototype.generateOHLCV = async function(start, end, interval, cb) {
  const ohlcvData = [];
  let current = moment(start);
  const endMoment = moment(end);

  while (current.isBefore(endMoment)) {
    const next = current.clone().add(interval, 'seconds');
    const trades = _.filter(await this.getTrades(null, () => {}), trade => {
      return moment.unix(trade.date).isBetween(current, next);
    });

    if (trades.length > 0) {
      const candle = CandleCreator.prototype.calculateCandle(trades);
      ohlcvData.push(candle);
    }

    current = next;
  }

  cb(null, ohlcvData);
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
        requires: [], 
        fetchTimespan: 60,
        tid: 'tid',
        tradable: false
    };
};

module.exports = Trader;
