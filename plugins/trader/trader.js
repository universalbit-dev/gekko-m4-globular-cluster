/**
 * Trader is a key plugin for the Gekko trading bot, responsible for executing trades on exchanges,
 * managing portfolio balances, and handling trade-related events. It acts as the interface between
 * Gekko's trading strategies and the real-world exchange APIs.
 *
 * Key Features:
 * - Executes buy and sell orders on supported cryptocurrency exchanges.
 * - Tracks and updates portfolio balances in real-time.
 * - Handles trade completion events and propagates updates to other components.
 * - Integrates with Gekko strategies to execute trading advice.
 * - Supports error handling, retries, and exchange-specific adjustments.
 *
 * Usage:
 * - Configure the trader settings in the Gekko configuration file under `trader`.
 * - Ensure API credentials and exchange-specific configurations are correctly set.
 * - Use `processAdvice` to handle and execute trading advice from strategies.
 * - Extensible for adding support for new exchanges and advanced trading features.
 *
 * License:
 * The MIT License (MIT)
 * Copyright (c) 2014-2017 Mike van Rossum
 */

// Importing required modules and dependencies
const _ = require('../../core/lodash.js'); // Utility library for working with objects, arrays, etc.
const util = require('../../core/util.js'); // Gekko core utilities for configuration and logging
const config = util.getConfig(); // Load configuration settings
const dirs = util.dirs(); // Load directory paths
const moment = require('moment'); // Date and time library
const { EventEmitter } = require("events"); class Event extends EventEmitter {}; // EventEmitter for handling asynchronous events
const log = require(dirs.core + 'log'); // Logging utility
const Broker = require(dirs.broker + '/gekkoBroker'); // Broker module for interacting with exchanges

// Ensure exchange dependencies are met
require(dirs.gekko + '/exchange/dependencyCheck');

// Main Trader class
const Trader = function(next) {

  // Bind all methods of the Trader class to its instance
  _.bindAll(this, _.functions(this));

  // Broker configuration combining trader and watch settings
  this.brokerConfig = {
    ...config.trader,
    ...config.watch,
    private: true
  };

  // Internal counters for tracking trade and trigger events
  this.propogatedTrades = 0;
  this.propogatedTriggers = 0;

  // Initialize the broker with the configuration
  try {
    this.broker = new Broker(this.brokerConfig);
  } catch (e) {
    util.die(e.message); // Terminate if broker initialization fails
  }

  // Check if the exchange supports the Gekko Broker interface
  if (!this.broker.capabilities.gekkoBroker) {
    util.die('This exchange is not yet supported');
  }

  // Synchronize portfolio and balances, then log the initial state
  this.sync(() => {
    log.info('\t', 'Portfolio:');
    log.info('\t\t', this.portfolio.currency, this.brokerConfig.currency);
    log.info('\t\t', this.portfolio.asset, this.brokerConfig.asset);
    log.info('\t', 'Balance:');
    log.info('\t\t', this.balance, this.brokerConfig.currency);
    log.info('\t', 'Exposed:');
    log.info('\t\t',
      this.exposed ? 'yes' : 'no',
      `(${(this.exposure * 100).toFixed(2)}%)`
    );
    next(); // Proceed to the next step after initialization
  });

  // Flags for order management
  this.cancellingOrder = false; // Indicates if an order is being canceled
  this.sendInitialPortfolio = false; // Tracks if the initial portfolio has been sent

  // Periodically synchronize portfolio and balances every 10 minutes
  setInterval(this.sync, 1000 * 60 * 10);
};

// Extend Trader with EventEmitter functionality
util.makeEventEmitter(Trader);
util.inherit(Event, Trader);

// Synchronize private data like portfolio and balances with the broker
Trader.prototype.sync = function(next) {
  log.debug('syncing private data');
  this.broker.syncPrivateData(() => {
    if (!this.price) {
      this.price = this.broker.ticker.bid; // Set the price based on the broker's bid price
    }

    const oldPortfolio = this.portfolio;

    this.setPortfolio(); // Update the portfolio
    this.setBalance(); // Update the balance

    // Emit a portfolio change event if the portfolio has changed
    if (this.sendInitialPortfolio && !_.isEqual(oldPortfolio, this.portfolio)) {
      this.relayPortfolioChange();
    }

    if (next) {
      next(); // Call the callback if provided
    }
  });
};

// Emit a portfolio change event
Trader.prototype.relayPortfolioChange = function() {
  this.deferredEmit('portfolioChange', {
    asset: this.portfolio.asset,
    currency: this.portfolio.currency
  });
};

// Emit a portfolio value change event
Trader.prototype.relayPortfolioValueChange = function() {
  this.deferredEmit('portfolioValueChange', {
    balance: this.balance
  });
};

// Update the portfolio with the latest balances from the broker
Trader.prototype.setPortfolio = function() {
  this.portfolio = {
    currency: _.find(
      this.broker.portfolio.balances,
      b => b.name === this.brokerConfig.currency
    ).amount,
    asset: _.find(
      this.broker.portfolio.balances,
      b => b.name === this.brokerConfig.asset
    ).amount
  };
};

// Calculate the total balance and exposure
Trader.prototype.setBalance = function() {
  this.balance = this.portfolio.currency + this.portfolio.asset * this.price;
  this.exposure = (this.portfolio.asset * this.price) / this.balance;
  // If more than 10% of the balance is in the asset, we are considered exposed
  this.exposed = this.exposure > 0.1;
};

// Process a new market candle and update portfolio and balance
Trader.prototype.processCandle = function(candle, done) {
  this.price = candle.close; // Update the price based on the candle's close price
  const previousBalance = this.balance;
  this.setPortfolio(); // Update the portfolio
  this.setBalance(); // Update the balance

  // Emit the initial portfolio if it hasn't been sent yet
  if (!this.sendInitialPortfolio) {
    this.sendInitialPortfolio = true;
    this.deferredEmit('portfolioChange', {
      asset: this.portfolio.asset,
      currency: this.portfolio.currency
    });
  }

  // Emit a portfolio value change event if the balance has changed
  if (this.balance !== previousBalance) {
    this.relayPortfolioValueChange();
  }

  done(); // Indicate that processing is complete
};

// Process trading advice from the strategy
Trader.prototype.processAdvice = function(advice) {
  let direction;

  if (advice.recommendation === 'long') {
    direction = 'buy'; // Buy recommendation
  } else if (advice.recommendation === 'short') {
    direction = 'sell'; // Sell recommendation
  } else {
    log.error('ignoring advice in unknown direction');
    return; // Ignore invalid advice
  }

  const id = 'trade-' + (++this.propogatedTrades); // Generate a unique trade ID

  // Handle existing orders and conflicts
  if (this.order) {
    if (this.order.side === direction) {
      return log.info('ignoring advice: already in the process to', direction);
    }

    if (this.cancellingOrder) {
      return log.info('ignoring advice: already cancelling previous', this.order.side, 'order');
    }

    log.info('Received advice to', direction, 'however Gekko is already in the process to', this.order.side);
    log.info('Canceling', this.order.side, 'order first');
    return this.cancelOrder(id, advice, () => this.processAdvice(advice)); // Cancel the existing order first
  }

// Calculate the amount to trade and execute the order based on the advice
  let amount;

  if (direction === 'buy') {

    // Prevent buying if already exposed
    if (this.exposed) {
      log.info('NOT buying, already exposed');
      return this.deferredEmit('tradeAborted', {
        id,
        adviceId: advice.id,
        action: direction,
        portfolio: this.portfolio,
        balance: this.balance,
        reason: "Portfolio already in position."
      });
    }

    // Calculate the amount of asset to buy using 95% of the available currency
    amount = this.portfolio.currency / this.price * 0.95;

    log.info(
      'Trader',
      'Received advice to go long.',
      'Buying ', this.brokerConfig.asset
    );

  } else if (direction === 'sell') {

    // Prevent selling if not exposed
    if (!this.exposed) {
      log.info('NOT selling, already no exposure');
      return this.deferredEmit('tradeAborted', {
        id,
        adviceId: advice.id,
        action: direction,
        portfolio: this.portfolio,
        balance: this.balance,
        reason: "Portfolio already in position."
      });
    }

    // Clean up any active stop triggers before selling
    if (this.activeStopTrigger) {
      this.deferredEmit('triggerAborted', {
        id: this.activeStopTrigger.id,
        date: advice.date
      });

      this.activeStopTrigger.instance.cancel();

      delete this.activeStopTrigger;
    }

    // Set the amount to the total asset balance when selling
    amount = this.portfolio.asset;

    log.info(
      'Trader',
      'Received advice to go short.',
      'Selling ', this.brokerConfig.asset
    );
  }

  // Create an order to execute the trade
  this.createOrder(direction, amount, advice, id);
};

// Create and validate an order with the broker
Trader.prototype.createOrder = function(side, amount, advice, id) {
  const type = 'sticky'; // Default order type

  // Validate the order with the broker to check for issues like lot size or price constraints
  const check = this.broker.isValidOrder(amount, this.price);

  if (!check.valid) {
    log.warn('NOT creating order! Reason:', check.reason);
    return this.deferredEmit('tradeAborted', {
      id,
      adviceId: advice.id,
      action: side,
      portfolio: this.portfolio,
      balance: this.balance,
      reason: check.reason
    });
  }

  log.debug('Creating order to', side, amount, this.brokerConfig.asset);

  // Emit an event indicating that a trade has been initiated
  this.deferredEmit('tradeInitiated', {
    id,
    adviceId: advice.id,
    action: side,
    portfolio: this.portfolio,
    balance: this.balance
  });

  // Create the order through the broker
  this.order = this.broker.createOrder(type, side, amount);

  // Listen for order events such as partial fills, status changes, and errors
  this.order.on('fill', f => log.info('[ORDER] partial', side, 'fill, total filled:', f));
  this.order.on('statusChange', s => log.debug('[ORDER] statusChange:', s));

  // Handle errors during order execution
  this.order.on('error', e => {
    log.error('[ORDER] Gekko received error from GB:', e.message);
    log.debug(e);
    this.order = null;
    this.cancellingOrder = false;

    // Emit an event indicating that the trade encountered an error
    this.deferredEmit('tradeErrored', {
      id,
      adviceId: advice.id,
      date: moment(),
      reason: e.message
    });
  });

  // Handle order completion and generate a summary
  this.order.on('completed', () => {
    this.order.createSummary((err, summary) => {
      if (!err && !summary) {
        err = new Error('GB returned an empty summary.');
      }

      if (err) {
        log.error('Error while creating summary:', err);
        return this.deferredEmit('tradeErrored', {
          id,
          adviceId: advice.id,
          date: moment(),
          reason: err.message
        });
      }

      log.info('[ORDER] summary:', summary);
      this.order = null;
      this.sync(() => {

        // Calculate trade cost and effective price considering fees
        let cost;
        if (_.isNumber(summary.feePercent)) {
          cost = summary.feePercent / 100 * summary.amount * summary.price;
        }

        let effectivePrice;
        if (_.isNumber(summary.feePercent)) {
          if (side === 'buy') {
            effectivePrice = summary.price * (1 + summary.feePercent / 100);
          } else {
            effectivePrice = summary.price * (1 - summary.feePercent / 100);
          }
        } else {
          log.warn('WARNING: exchange did not provide fee information, assuming no fees..');
          effectivePrice = summary.price;
        }

        // Emit an event indicating that the trade was completed
        this.deferredEmit('tradeCompleted', {
          id,
          adviceId: advice.id,
          action: summary.side,
          cost,
          amount: summary.amount,
          price: summary.price,
          portfolio: this.portfolio,
          balance: this.balance,
          date: summary.date,
          feePercent: summary.feePercent,
          effectivePrice
        });

        // Handle trailing stop triggers, if applicable
        if (
          side === 'buy' &&
          advice.trigger &&
          advice.trigger.type === 'trailingStop'
        ) {
          const trigger = advice.trigger;
          const triggerId = 'trigger-' + (++this.propogatedTriggers);

          this.deferredEmit('triggerCreated', {
            id: triggerId,
            at: advice.date,
            type: 'trailingStop',
            properties: {
              trail: trigger.trailValue,
              initialPrice: summary.price,
            }
          });

          log.info(`Creating trailingStop trigger "${triggerId}"! Properties:`);
          log.info(`\tInitial price: ${summary.price}`);
          log.info(`\tTrail of: ${trigger.trailValue}`);

          this.activeStopTrigger = {
            id: triggerId,
            adviceId: advice.id,
            instance: this.broker.createTrigger({
              type: 'trailingStop',
              onTrigger: this.onStopTrigger,
              props: {
                trail: trigger.trailValue,
                initialPrice: summary.price,
              }
            })
          };
        }
      });
    });
  });
};

// Trigger handler for trailing stop orders
Trader.prototype.onStopTrigger = function(price) {
  log.info(`TrailingStop trigger "${this.activeStopTrigger.id}" fired! Observed price was ${price}`);

  // Emit an event indicating that the trigger has fired
  this.deferredEmit('triggerFired', {
    id: this.activeStopTrigger.id,
    date: moment()
  });

  // Generate a mock advice object to process a short recommendation
  const adviceMock = {
    recommendation: 'short',
    id: this.activeStopTrigger.adviceId
  };

  delete this.activeStopTrigger;

  this.processAdvice(adviceMock);
};

// Cancel an existing order and proceed with the next step
Trader.prototype.cancelOrder = function(id, advice, next) {

  if (!this.order) {
    return next();
  }

  this.cancellingOrder = true;

  this.order.removeAllListeners();
  this.order.cancel();
  this.order.once('completed', () => {
    this.order = null;
    this.cancellingOrder = false;

    // Emit an event indicating that the trade was canceled
    this.deferredEmit('tradeCancelled', {
      id,
      adviceId: advice.id,
      date: moment()
    });
    this.sync(next); // Synchronize portfolio and balance after cancellation
  });
};

// Export the Trader module
module.exports = Trader;
