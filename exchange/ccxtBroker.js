/* Generated by Copilot
This implementation extends the functionality of the existing gekkoBroker.js to use the ccxt library for interacting with exchanges.
*/

/*
Key components:
    Imports: Includes various required modules and utilities.
    Constructor: Initializes the broker with configuration, sets API using ccxt, capabilities, market configuration, and initializes the portfolio if private.
    Methods:
        cantTrade and cantMonitor: Check if trading or monitoring is allowed.
        sync and syncPrivateData: Sync data with the exchange, including setting ticker and balances.
        setTicker: Fetches and sets the current ticker from the exchange using ccxt.
        isValidOrder: Validates an order based on amount and price.
        createOrder: Creates a new order and manages its state and events.
        createTrigger: Creates a new trigger for specific events.
        delay: Delays execution for a specified time.
This class integrates ccxt to manage communication with exchanges, enhancing the original broker functionality.
*/

const ccxt = require('ccxt');
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

class CcxtBroker {
  constructor(config) {
    this.config = config;

    if(config.private) {
      if(this.cantTrade()) {
        throw new Error(this.cantTrade());
      }
    } else {
      if(this.cantMonitor()) {
        throw new Error(this.cantMonitor());
      }
    }

    this.orders = {
      open: [],
      closed: []
    }

    const slug = config.exchange.toLowerCase();
    this.api = new ccxt[slug](config);

    this.capabilities = this.api.has;

    this.marketConfig = {
      base: config.currency.toUpperCase(),
      quote: config.asset.toUpperCase()
    };

    if(config.customInterval) {
      this.interval = config.customInterval;
      this.api.interval = config.customInterval;
      console.log(new Date, '[GB] setting custom interval to', config.customInterval);
    } else {
      this.interval = 1500;
    }

    this.market = config.currency.toUpperCase() + config.asset.toUpperCase();

    if(config.private) {
      this.portfolio = new Portfolio(config, this.api);
    }

    bindAll(this);
  }

  cantTrade() {
    return checker.cantTrade(this.config);
  }

  cantMonitor() {
    return checker.cantMonitor(this.config);
  }

  async sync() {
    if(!this.config.private) {
      await this.setTicker();
      return;
    }

    if(this.cantTrade()) {
      throw new errors.ExchangeError(this.cantTrade());
    }

    await this.syncPrivateData();
  }

  async syncPrivateData() {
    await this.setTicker();
    await this.delay(this.interval);
    await this.portfolio.setFee();
    await this.delay(this.interval);
    await this.portfolio.setBalances();
    await this.delay(this.interval);
  }

  async setTicker() {
    try {
      const ticker = await this.api.fetchTicker(this.market);
      this.ticker = ticker;
    } catch (err) {
      console.log(this.api.name, err.message);
      throw new errors.ExchangeError(err);
    }
  }

  isValidOrder(amount, price) {
    return isValidOrder({
      market: this.marketConfig,
      api: this.api,
      amount,
      price
    });
  }

  createOrder(type, side, amount, parameters, handler) {
    if(!this.config.private)
      throw new Error('Client not authenticated');

    if(side !== 'buy' && side !== 'sell')
      throw new Error('Unknown side ' + side);

    if(!orders[type])
      throw new Error('Unknown order type');

    const order = new orders[type]({
      api: this.api,
      marketConfig: this.marketConfig,
      capabilities: this.capabilities
    });

    this.syncPrivateData().then(() => {
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

  createTrigger({type, onTrigger, props}) {
    return new Trigger({
      api: this.api,
      type,
      onTrigger,
      props
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CcxtBroker;
