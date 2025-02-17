require('dotenv').config();
const ccxt = require('ccxt');
const moment = require('moment');
const { retry } = require('../exchangeUtils');
const util = require('../../core/util.js');
const EventEmitter = require('events');
const math = require('mathjs');
const config = util.getConfig();

const marketData = require('./ccxt-markets.json');

class Trader extends EventEmitter {
  constructor(config) {
    super(config);
    this.key = config.key;
    this.secret = config.secret;
    this.currency = config.currency;
    this.asset = config.asset;
    this.exchangeId = config.exchangeId;  // Added exchangeId to config
    this.pair = `${this.asset}/${this.currency}`;
    this.api = new ccxt[this.exchangeId]({ apiKey: this.key, secret: this.secret });

    this.name = this.api.name;
    this.slug = this.exchangeId;
    this.nonce = new Date() * 1000;
  }

  async api_query(method, ...params) {
    try {
      const data = await this.api[method](...params);
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getTrades(since, callback, descending) {
    try {
      const data = await this.api_query('fetchTrades', this.pair);
      const parsedTrades = data.map(trade => ({
        tid: trade.id,
        date: trade.timestamp,
        price: trade.price,
        amount: trade.amount
      }));
      callback(null, descending ? parsedTrades : parsedTrades.reverse());
    } catch (error) {
      callback(error);
    }
  }

  async getTicker(callback) {
    try {
      const data = await this.api_query('fetchTicker', this.pair);
      callback(null, { bid: data.bid, ask: data.ask });
    } catch (error) {
      callback(error);
    }
  }

  getFee(callback) {
    callback(null, this.api.fees.trading.taker);
  }

  roundAmount(amount) {
    return math.floor(amount, 8);
  }

  roundPrice(price) {
    return price;
  }

  async submitOrder(type, amount, price, callback) {
    try {
      const data = await this.api_query('createOrder', this.pair, 'limit', type, amount, price);
      callback(null, data.id);
    } catch (error) {
      callback(error);
    }
  }

  buy(amount, price, callback) {
    this.submitOrder('buy', amount, price, callback);
  }

  sell(amount, price, callback) {
    this.submitOrder('sell', amount, price, callback);
  }

  async getOrder(order_id, callback) {
    try {
      const data = await this.api_query('fetchOrder', order_id, this.pair);
      if (!data) throw new Error('Order not found');
      callback(null, { price: data.price, amount: data.amount, date: moment(data.timestamp) });
    } catch (error) {
      callback(error);
    }
  }

  async checkOrder(order_id, callback) {
    try {
      const data = await this.api_query('fetchOrder', order_id, this.pair);
      const executed = data.status === 'closed';
      const open = data.status === 'open';
      callback(null, { executed, open });
    } catch (error) {
      callback(error);
    }
  }

  async cancelOrder(order_id, callback) {
    try {
      await this.api_query('cancelOrder', order_id, this.pair);
      callback(null, false);
    } catch (error) {
      callback(error);
    }
  }

  async getPortfolio(callback) {
    try {
      const data = await this.api_query('fetchBalance');
      const balances = Object.entries(data.total).map(([name, amount]) => ({ name, amount }));
      const portfolio = balances.filter(c => c.name === this.asset || c.name === this.currency);
      callback(null, portfolio);
    } catch (error) {
      callback(error);
    }
  }

  static getCapabilities() {
    return {
      name: 'Generic Exchange',
      slug: 'generic',
      currencies: marketData.currencies,
      assets: marketData.assets,
      markets: marketData.markets,
      requires: ['key', 'secret', 'exchangeId'],  // Added exchangeId to required fields
      providesHistory: false,
      tid: 'tid',
      tradable: true,
      gekkoBroker: 0.6
    };
  }
}

module.exports = Trader;
