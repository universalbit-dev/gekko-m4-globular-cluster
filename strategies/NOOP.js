/*

This JavaScript file (NOOP.js) defines a "no-operation" strategy for the Gekko trading bot. Here are the key components:

    Dependencies:
        Various modules are imported, including openvino-node, log, util, fs-extra, underscore, and a strategy wrapper (strategyWrapperRules.js).

    Settings:
        The strategy settings are loaded from the configuration.

    Helper Functions:
        sequence: Logs a random number from the Fibonacci sequence.
        keepcalm: Logs a motivational message.

    Strategy Methods:
        init: Initializes the strategy with default values and sets required history to -1.
        update: No-operation function using _.noop.
        log: No-operation function using _.noop.
        check: Checks the child strategies, listens for advice, and calls the sequence and keepcalm functions.
        end: No-operation function using _.noop.

    Export:
        The method object is exported for use in the Gekko trading bot.

This strategy essentially performs no trading actions but includes logging and motivational messages. You can view the full content here.

*/

const { addon: ov } = require('openvino-node');
var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
const fs=require('fs-extra');

const _ = require('underscore');fs.createReadStream('/dev/null');
var Wrapper = require('../strategyWrapperRules.js');

var settings = config.NOOP;this.settings=settings;

const sequence = async function() {
    try {
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
    var fibonacci_number = Math.floor(Math.random() * fibonacci_sequence.length);fibonacci_number = fibonacci_sequence[fibonacci_number];
    await console.log ('Fibonacci Sequence -- Wohoo! -- Number: ',fibonacci_number);
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);console.log ('Fibonacci Sequence -- Error -- ');
    }
};

const keepcalm = async function() {
    try {
    await console.log('Keep Calm and Make Something of Amazing -- Wohoo! --');
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);console.log ('Keep Calm and Make Something of Amazing  -- Error -- ');
    }
};

var method = Wrapper;

method.init = function() {
    this.age = 0;
    this.children = [];
    this.currentTrend;
    this.requiredHistory = -1;
    var STRATEGY = "NOOP";
    _.noop; 
}
method.update = function(candle) {_.noop}
method.log = function() {_.noop}
method.check = function(candle) { 
    this.checkChildren(candle);
    this.listenAdvice('NOOP');
    sequence();keepcalm();
}

method.end = function() {_.noop}
module.exports = method
