/*copilot explain
This JavaScript file defines a Wrapper object that manages multiple trading strategies for the Gekko trading bot. Here is a breakdown of its main components:

    Dependencies:
        lodash is imported for utility functions.
        Wrapper is initialized as an empty object.

    Attributes:
        Wrapper.children: An array to hold instances of child strategies.
        Wrapper.requiredHistory: Set to -1, meaning no historical data is required.
        Wrapper.age: Initialized to 0.

    Method: createChild
        Takes a strategy name (stratname) and settings.
        Requires the baseTradingMethod from tradingAdvisor.
        Imports the strategy file using the provided strategy name.
        Copies all functions from the strategy file to the Consultant prototype.
        Adds a custom collectAdvice method to handle advice.
        Creates a new Consultant (strategy instance) with the provided settings.
        Sets an event listener for 'advice' to call collectAdvice.
        Adds the new strategy instance to children and returns it.

    Method: checkChildren
        Takes a candle (market data) as input.
        Iterates over each child strategy, resets its lastAdvice, and calls the tick method with the candle data.

    Method: listenAdvice
        Takes a child strategy as input.
        If the child has a lastAdvice, it calls advice with the recommendation.
        Otherwise, it calls advice without arguments.

    Exports:
        The Wrapper object is exported for use in other modules.

This setup allows for the dynamic creation and management of multiple trading strategies within the Gekko trading bot framework.
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
