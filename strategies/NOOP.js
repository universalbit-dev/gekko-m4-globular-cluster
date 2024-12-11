const { addon: ov } = require('openvino-node');
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
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs-extra"));fs.createReadStream('/dev/null');

var settings = config.NOOP;this.settings=settings;

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var seqms = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)];

var sequence = ms => new Promise(resolve => setTimeout(resolve, seqms));
async function sequence() {await sequence;
};

/* async keep calm and make something of amazing */
var keepcalm = ms => new Promise(resolve => setTimeout(resolve,seqms));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;
};

// This method is a noop (it doesn't do anything)
var method = {
init : async function(){this.name = 'NOOP';
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1});
},

update : async function(candle){_.noop},
log : async function(){_.noop},
check : async function(candle){_.noop;sequence();},
end : async function() {_.noop}
};

module.exports = method;
