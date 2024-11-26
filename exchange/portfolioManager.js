/* The Portfolio class holds data about the portfolio */

var Promise = require("bluebird");const _ = Promise.promisify(require("underscore"));
const util=require('../core/util');
const errors = require('./exchangeErrors');
var config = util.getConfig();

const {EventEmitter} = require('events');class Event extends EventEmitter {};
const eventEmitter = new EventEmitter();


class Portfolio extends Event{
  constructor(config, api) {
  super();
  EventEmitter.call(this);
    _.bindAll(this,_.functions(Portfolio.prototype));
    this.config = config;
    this.api = api;
    this.balances = {};
    this.fee = null;
  }

  getBalance(fund) {return this.getFund(fund).amount;}
  // return the [fund] based on the data we have in memory
  getFund(fund) {return _.find(this.balances, function(f) { return f.name === fund});}
  // convert into the portfolio expected by the performanceAnalyzer
  convertBalances(asset,currency) { // rename?
    var asset = _.find(this.balances, a => a.name === this.config.asset).amount;
    var currency = _.find(this.balances, a => a.name === this.config.currency).amount;

    return {currency,asset,balance: currency + (asset * this.ticker.bid)}
  }

  setBalances(callback) {
    let set = (err, fullPortfolio) => {
      if(err) {
        console.log(err);
        throw new errors.ExchangeError(err);
      }

      // only include the currency/asset of this market
      const balances = [ this.config.currency, this.config.asset ]
        .map(name => {
          let item = _.find(fullPortfolio, {name});
          if(!item) {item = {name, amount: 0};}return item;
        });

      this.balances = balances;
      if(_.isFunction(callback))callback();
    }
    this.api.getPortfolio(set);
  }
  
  setFee(callback) {
    this.api.getFee((err, fee) => {
      if(err) throw new errors.ExchangeError(err);
      this.fee = fee;
      if(_.isFunction(callback))callback();
    });
  }
  setTicker(ticker) {this.ticker = ticker}

}
util.makeEventEmitter(Portfolio);util.inherit(Portfolio, EventEmitter);

module.exports = Portfolio
