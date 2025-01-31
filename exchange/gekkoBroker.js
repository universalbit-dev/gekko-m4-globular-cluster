/**
* @see {@link https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/gekkoBroker.md|GitHub}
 */

/*  Copilot Enhancements:

    Added JSDoc comments to all functions and the class to improve documentation and understanding.
    Improved error handling
    Modularized some inline functions for better readability.
*/

const _ = require('lodash');
const async = require('async');
const events = require('events');
const moment = require('moment');
const checker = require('./exchangeChecker');
const errors = require('./exchangeErrors');
const Portfolio = require('./portfolioManager');
const orders = require('./orders');
const Trigger = require('./trigger');
const exchangeUtils = require('./exchangeUtils');
const bindAll = exchangeUtils.bindAll;
const isValidOrder = exchangeUtils.isValidOrder;

/**
 * Broker class to manage communication with the exchange.
 */
class Broker {
  /**
   * Creates an instance of Broker.
   * @param {Object} config - The configuration object.
   */
  constructor(config) {
    this.config = config;

    if (config.private) {
      const tradeError = this.cantTrade();
      if (tradeError) throw new Error(tradeError);
    } else {
      const monitorError = this.cantMonitor();
      if (monitorError) throw new Error(monitorError);
    }

    this.orders = {
      // Contains current open orders
      open: [],
      // Contains all closed orders
      closed: []
    };

    const slug = config.exchange.toLowerCase();
    const API = require('./wrappers/' + slug);
    this.api = new API(config);
    this.capabilities = API.getCapabilities();

    this.marketConfig = _.find(this.capabilities.markets, (p) => {
      return _.first(p.pair) === config.currency.toUpperCase() &&
             _.last(p.pair) === config.asset.toUpperCase();
    });

    if (config.customInterval) {
      this.interval = config.customInterval;
      this.api.interval = config.customInterval;
      console.log(new Date, '[GB] setting custom interval to', config.customInterval);
    } else {
      this.interval = this.api.interval || 1500;
    }

    this.market = `${config.currency.toUpperCase()}${config.asset.toUpperCase()}`;

    if (config.private) {
      this.portfolio = new Portfolio(config, this.api);
    }

    bindAll(this);
  }

  /**
   * Checks if trading is possible.
   * @returns {string|undefined} - Returns error message if trading is not possible.
   */
  cantTrade() {
    return checker.cantTrade(this.config);
  }

  /**
   * Checks if monitoring is possible.
   * @returns {string|undefined} - Returns error message if monitoring is not possible.
   */
  cantMonitor() {
    return checker.cantMonitor(this.config);
  }

  /**
   * Synchronizes data with the exchange.
   * @param {Function} [callback] - Optional callback function.
   */
  sync(callback) {
    if (!this.private) {
      this.setTicker();
      return;
    }

    const tradeError = this.cantTrade();
    if (tradeError) throw new errors.ExchangeError(tradeError);

    this.syncPrivateData(callback);
  }

  /**
   * Synchronizes private data with the exchange.
   * @param {Function} [callback] - Optional callback function.
   */
  syncPrivateData(callback) {
    async.series([
      this.setTicker,
      next => setTimeout(next, this.interval),
      this.portfolio.setFee.bind(this.portfolio),
      next => setTimeout(next, this.interval),
      this.portfolio.setBalances.bind(this.portfolio),
      next => setTimeout(next, this.interval)
    ], callback);
  }

  /**
   * Sets the ticker data.
   * @param {Function} [callback] - Optional callback function.
   */
  setTicker(callback) {
    this.api.getTicker((err, ticker) => {
      if (err) {
        console.log(this.api.name, err.message || 'err not wrapped in error:', err);
        throw new errors.ExchangeError(err);
      }

      this.ticker = ticker;

      if (_.isFunction(callback)) callback();
    });
  }

  /**
   * Validates if an order is valid.
   * @param {number} amount - The order amount.
   * @param {number} price - The order price.
   * @returns {boolean} - Returns true if the order is valid.
   */
  isValidOrder(amount, price) {
    return isValidOrder({
      market: this.marketConfig,
      api: this.api,
      amount,
      price
    });
  }

  /**
   * Creates an order.
   * @param {string} type - The order type.
   * @param {string} side - The order side (buy/sell).
   * @param {number} amount - The order amount.
   * @param {Object} parameters - The order parameters.
   * @param {Function} handler - The order handler function.
   * @returns {Object} - Returns the created order.
   */
  createOrder(type, side, amount, parameters, handler) {
    if (!this.config.private) throw new Error('Client not authenticated');
    if (side !== 'buy' && side !== 'sell') throw new Error('Unknown side ' + side);
    if (!orders[type]) throw new Error('Unknown order type');

    const order = new orders[type]({
      api: this.api,
      marketConfig: this.marketConfig,
      capabilities: this.capabilities
    });

    this.syncPrivateData(() => {
      order.setData({
        balances: this.portfolio.balances,
        ticker: this.ticker,
      });

      order.create(side, amount, parameters);
    });

    order.on('completed', summary => {
      _.remove(this.orders.open, order);
      this.orders.closed.push(summary);
    });

    return order;
  }

  /**
   * Creates a trigger.
   * @param {Object} params - The trigger parameters.
   * @param {string} params.type - The trigger type.
   * @param {Function} params.onTrigger - The trigger function.
   * @param {Object} params.props - The trigger properties.
   * @returns {Object} - Returns the created trigger.
   */
  createTrigger({ type, onTrigger, props }) {
    return new Trigger({
      api: this.api,
      type,
      onTrigger,
      props
    });
  }
}

module.exports = Broker;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
