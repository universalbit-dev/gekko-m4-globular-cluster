/*
  The broker manages all communication with the exchange, delegating:

  - the management of the portfolio to the portfolioManager
  - the management of actual trades to "orders".
*/

//Why Promises https://bluebirdjs.com/docs/why-promises.html
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
const async = require('async');
const EventEmitter = Promise.promisifyAll(require("node:events"));
const eventEmitter = new EventEmitter();

const util=require('../core/util');
var config = util.getConfig();
const moment = require('moment');

var checker=Promise.promisifyAll(require("./exchangeChecker.js"));
var errors=Promise.promisifyAll(require("./exchangeErrors.js"));
var Portfolio=Promise.promisifyAll(require("./portfolioManager.js"));
var orders=Promise.promisifyAll(require("./orders/order.js"));
var Trigger=Promise.promisifyAll(require("./trigger.js"));
var exchangeUtils=Promise.promisifyAll(require("./exchangeUtils.js"));

const bindAll = exchangeUtils.bindAll;
const isValidOrder = exchangeUtils.isValidOrder;

class Event extends EventEmitter {};

class Broker extends EventEmitter{
  constructor(config) {
  super();
  EventEmitter.call(this);
  this.config = config;
    const slug = config.exchange.toLowerCase();
    const API = require('./wrappers/' + slug);
    this.api = new API(config);
    this.capabilities = API.getCapabilities();

    this.marketConfig = _.find(this.capabilities.markets, (p) => {
      return _.first(p.pair) === config.currency.toUpperCase() &&
        _.last(p.pair) === config.asset.toUpperCase();
    });

    if(config.customInterval) {
      this.interval = config.customInterval;
      this.api.interval = config.customInterval;
      console.log(new Date, '[GB] setting custom interval to', config.customInterval);
    } else {this.interval = this.api.interval || 1000;}

    this.market = config.currency.toUpperCase() + config.asset.toUpperCase();

    if(config.private) {this.portfolio = new Portfolio(config, this.api);}

    bindAll(this);
  }

  cantTrade() {return checker.cantTrade(this.config);}
  cantMonitor() {return checker.cantMonitor(this.config);}

  async(callback) {
    if(!this.private) {this.setTicker();return;}
    if(this.cantTrade()) {throw new errors.ExchangeError(this.cantTrade());}
    this.asyncPrivateData();
  }

  asyncPrivateData(callback) {
    async.auto([
      this.setTicker,
      next => setTimeout(next, this.interval),
      this.portfolio.setFee.bind(this.portfolio),
      next => setTimeout(next, this.interval),
      this.portfolio.setBalances.bind(this.portfolio),
      next => setTimeout(next, this.interval)
    ], callback);
  }

  setTicker(callback) {
    this.api.getTicker((err, ticker) => {

      if(err) {
        if(err.message) {console.log(this.api.name, err.message);throw err;} 
        else {console.log('err not wrapped in error:', err);throw new errors.ExchangeError(err);}
      }
      this.ticker = ticker;
      
      if(_.isFunction(callback))callback();
    });
  }

  isValidOrder(amount, price) {
    return isValidOrder({market: this.marketConfig,api: this.api,amount,price});
  }

  createOrder(type, side, amount, parameters, handler) {
    if(!this.config.private) {throw new Error('Client not authenticated');}
    if(side !== 'buy' && side !== 'sell') {throw new Error('Unknown side ' + side);}
    if(!orders[type]) {throw new Error('Unknown order type');}

    const order = new orders[type]({api: this.api,marketConfig: this.marketConfig,capabilities: this.capabilities});
    // todo: figure out a smarter generic way
    this.asyncPrivateData(() => {order.setData({balances: this.portfolio.balances,ticker: this.ticker,});order.create(side, amount, parameters);});
    eventEmitter.on('completed', summary => {_.remove(this.orders.open, order);this.orders.closed.push(summary);});
    return order;
  }
  createTrigger({type, onTrigger, props}) {return new Trigger({api: this.api,type,onTrigger,props});}
}

module.exports = Broker;
