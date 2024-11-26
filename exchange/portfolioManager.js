/* The Portfolio class holds data about the portfolio */

var Promise = require("bluebird");const _ = Promise.promisify(require("underscore"));
const util=require('../core/util');
const errors = require('./exchangeErrors');
var config = util.getConfig();

const {EventEmitter} = require("events");class Event extends EventEmitter {};
const eventEmitter = new EventEmitter();


class Portfolio extends Event{
  constructor(config, api) {
  super();
  EventEmitter.call(this);
    _.bindAll(this,_.functions(this));
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
util.makeEventEmitter(Portfolio);

module.exports = Portfolio

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
