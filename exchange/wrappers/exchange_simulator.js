//exchanges: used to test purposes to develop Gekko (works without internet).

const _ = require('../../core/lodash');
const moment = require('moment');
const util = require('../../core/util');
const config = util.getConfig();

const TREND_DURATION = 1000;

const Trader = function() {
  _.bindAll(this, _.functionsIn(this));
  this.name = 'Exchange Simulator';
  this.at = moment().subtract(30, 'minutes');
  // simulate data
  this.price = 100;
  this.trend = 'up';
  this.tid = 0;
}
util.makeEventEmitter(Trader);

Trader.prototype.getTrades = function(since, cb) {
  const amount = moment().diff(this.at, 'seconds');

  const trades = _.range(amount).map(() => {

    this.tid++;

    if(this.tid % TREND_DURATION === 0) {
      if(this.trend === 'up')
        this.trend = 'down';
      else
        this.trend = 'up';
    }

    if(this.trend === 'up')
      this.price += Math.random();
    else
      this.price -= Math.random();

    return {
      date: this.at.add(1, 'seconds').unix(),
      price: this.price,
      amount: Math.random() * 100,
      tid: this.tid
    }
  });

  console.log(
    `[EXCHANGE SIMULATOR] emitted ${amount} trades, up until ${this.at.format('YYYY-MM-DD HH:mm:ss')}.`
  );

  cb(null, trades);
}

Trader.getCapabilities = function () {
  return {
    name: 'Exchange Simulator',
    slug: 'exchange_simulator',
    currencies: ['BTC'],
    assets: ['LTC'],
    maxTradesAge: 60,
    maxHistoryFetch: null,
    markets: [
      { pair: ['BTC', 'LTC'], minimalOrder: {amount: 0.1} },
    ],
    requires: ['key', 'secret'],
    fetchTimespan: 60,
    tid: 'tid',
    tradable: true
  };
}

module.exports = Trader;
