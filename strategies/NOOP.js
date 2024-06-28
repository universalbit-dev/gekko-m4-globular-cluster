require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');
var fs = require('node:fs');
var async = require('async');
var settings = config.NOOP;this.settings=settings;

var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(60000);};

// This method is a noop (it doesn't do anything)
var method = {
init : async function(){this.name = 'NOOP';
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1});
},

update : async function(candle){_.noop},
log : async function(){_.noop},
check : async function(candle){_.noop},
end : async function() {_.noop}
};

module.exports = method;
