const ccxt = require('ccxt');
const moment = require('moment');
const _ = require('lodash');
const exchangeUtils = require('../exchangeUtils');
const retry = exchangeUtils.retry;

const marketData = require('./ccxt-markets.json');

const Trader = function(config) {
  _.bindAll(this,_.functions(this));
  
  if (_.isObject(config)) {
    this.key = process.env.key;
    this.secret = process.env.secret;
    this.exchangeId = process.env.exchangeId; // Added exchangeId to config
    this.asset = process.env.asset;
    this.currency = process.env.currency;
  }
  
  // Check if the exchangeId is valid
  if (!ccxt.exchanges.includes(this.exchangeId)) {
    throw new Error(`Invalid exchangeId: ${this.exchangeId}`);
  }
  this.name = 'CCXT';
  this.pair = `${this.asset}/${this.currency}`;
  this.api = new ccxt[id] ({verbose: false,apikey,apisecret,});
  this.interval = 4000;
};

const recoverableErrors = [
  'SOCKETTIMEDOUT',
  'TIMEDOUT',
  'CONNRESET',
  'CONNREFUSED',
  'NOTFOUND',
  'Service:Unavailable',
  'Request timed out',
  'Empty response',
  'API:Invalid nonce',
  'General:Temporary lockout',
  'Response code 525',
  'Service:Busy'
];

Trader.prototype.handleResponse = function(funcName, callback, nonMutating, payload) {
  return (error, data) => {
    if (!error && !data) {
      error = new Error('Empty response');
    }

    if (error) {
      if (includes(error.message, recoverableErrors)) {
        error.notFatal = true;
      }

      if (includes(error.message, ['Rate limit exceeded'])) {
        error.notFatal = true;
        error.backoffDelay = 2500;
      }

      if (nonMutating && includes(error.message, unknownResultErrors)) {
        error.notFatal = true;
      }

      return callback(error);
    }

    return callback(undefined, data);
  };
};

Trader.prototype.getTrades = async function(since, callback, descending) {
  try {
    const data = await this.api.fetchTrades(this.pair);
    const trades = data.map(trade => ({
      tid: trade.id,
      date: trade.timestamp,
      price: trade.price,
      amount: trade.amount
    }));
    callback(null, descending ? trades : trades.reverse());
  } catch (error) {
    callback(error);
  }
};

Trader.prototype.getPortfolio = async function(callback) {
  try {
    const data = await this.api.fetchBalance();
    const balances = Object.entries(data.total).map(([name, amount]) => ({ name, amount }));
    const portfolio = balances.filter(c => c.name === this.asset || c.name === this.currency);
    callback(null, portfolio);
  } catch (error) {
    callback(error);
  }
};

Trader.prototype.getFee = function(callback) {
  const makerFee = 0.1;
  callback(null, makerFee / 100);
};

Trader.prototype.getTicker = async function(callback) {
  try {
    const data = await this.api.fetchTicker(this.pair);
    callback(null, { bid: data.bid, ask: data.ask });
  } catch (error) {
    callback(error);
  }
};

Trader.prototype.roundAmount = function(amount) {
  return Math.floor(amount * 100000000) / 100000000;
};

Trader.prototype.roundPrice = function(price) {
  return price;
};

Trader.prototype.submitOrder = async function(type, amount, price, callback) {
  try {
    const order = await this.api.createOrder(this.pair, 'limit', type, amount, price);
    callback(null, order.id);
  } catch (error) {
    callback(error);
  }
};

Trader.prototype.buy = function(amount, price, callback) {
  this.submitOrder('buy', amount, price, callback);
};

Trader.prototype.sell = function(amount, price, callback) {
  this.submitOrder('sell', amount, price, callback);
};

Trader.prototype.getOrder = async function(order_id, callback) {
  try {
    const data = await this.api.fetchOrder(order_id, this.pair);
    if (!data) throw new Error('Order not found');
    callback(null, { price: data.price, amount: data.amount, date: moment(data.timestamp) });
  } catch (error) {
    callback(error);
  }
};

Trader.prototype.checkOrder = async function(order_id, callback) {
  try {
    const data = await this.api.fetchOrder(order_id, this.pair);
    const executed = data.status === 'closed';
    const open = data.status === 'open';
    callback(null, { executed, open });
  } catch (error) {
    callback(error);
  }
};

Trader.prototype.cancelOrder = async function(order_id, callback) {
  try {
    await this.api.cancelOrder(order_id, this.pair);
    callback(null, false);
  } catch (error) {
    callback(error);
  }
};

Trader.getCapabilities = function() {
  return {
    name: 'CCXT Exchange',
    slug: 'ccxt',
    currencies: marketData.currencies,
    assets: marketData.assets,
    markets: marketData.markets,
    requires: ['key', 'secret', 'exchangeId'], // Added exchangeId to required fields
    providesHistory: false,
    tid: 'tid',
    tradable: true,
    gekkoBroker: 0.6
  };
};

module.exports = Trader;
