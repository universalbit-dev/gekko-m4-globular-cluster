/*
  This file defines a Wrapper object for managing multiple trading strategies in the Gekko trading bot.

  Overview:
  - Uses lodash for utility functions.
  - Exports a Wrapper object to coordinate strategy instances.

  Main Components:

    Attributes:
    - Wrapper.children: Array holding child strategy instances.
    - Wrapper.requiredHistory: Set to -1 (no historical data required).
    - Wrapper.age: Tracks the age of the Wrapper (starts at 0).

    Methods:
    - createChild(stratname, settings):
        • Loads the specified strategy and its settings.
        • Copies all functions from the strategy into the Consultant prototype.
        • Adds a custom collectAdvice handler for strategy advice.
        • Instantiates a Consultant, sets up advice event listening, stores it in children, and returns the instance.
    - checkChildren(candle):
        • For each child strategy, resets its last advice and triggers the tick method with the provided market data.
    - listenAdvice(child):
        • If the child has advice, calls the advice handler with the recommendation; otherwise, calls it with no arguments.

  Purpose:
  - Enables dynamic creation, event handling, and management of multiple trading strategies within the Gekko framework.
  - Exports the Wrapper for use in other modules.
*/

var _ = require('lodash');

var Wrapper = {};
// SETUP BASE ATTRIBUTES OF THE STRATEGY (requiredHistory best at NULL which is -1);
Wrapper.children = [];
Wrapper.requiredHistory = -1;
Wrapper.age = 0;

// METHOD TO CREATE CHILDREN STRATEGY WITH GEKKO STRAT BASE CLASS INCORPORATED;
Wrapper.createChild = function(stratname, settings) {
    //  REPRODUCE STEPS ON gekko/plugins/tradingAdvisor.js

    var Consultant = require('../plugins/tradingAdvisor/baseTradingMethod');

    var stratMethod = require('./'+stratname+'.js');

    _.each(stratMethod, function(fn, name) {
        Consultant.prototype[name] = fn;
    });

    Consultant.prototype.collectAdvice = function(advice)
    {
        this.lastAdvice = advice;

    }
    var Strategy = new Consultant(settings);

    Strategy.on('advice', Strategy.collectAdvice );
    this.children.push(Strategy);
    return Strategy;

}

Wrapper.checkChildren = function(candle) {
_.each(this.children, function(child) {
    child.lastAdvice = false;
    child.tick(candle);
})
}

Wrapper.listenAdvice = function(child) {
if (child.lastAdvice) {
this.advice(child.lastAdvice.recommendation)
}
else {
this.advice()
}
}

module.exports = Wrapper;
