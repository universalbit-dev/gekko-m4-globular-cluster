/* */
const moment = require('moment');const _ = require('underscore');

var fibonacci_sequence = ['0', '1', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '144', '233', '377', '610', '987', '1597', '2584', '4181', '6765'];
var fibonacci_number = Math.floor(Math.random() * fibonacci_sequence.length);
const TREND_DURATION = fibonacci_number;

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Trader = function(initialPrice = 10, initialTrend = 'up') {
    this.name = 'ExchangeSimulator';
    this.at = moment().subtract(1, 's');
    this.price = initialPrice;
    this.trend = initialTrend;
    this.tid = 0;
};

Trader.prototype.fetchLatestPrice = async function() {
    try {
        // Simulate fetching the latest price
        this.price = this.price + getRndInteger(-2, 2); // Randomly adjust price for simulation
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
        requires: [], 
        fetchTimespan: 60,
        tid: 'tid',
        tradable: false
    };
};

module.exports = Trader;
