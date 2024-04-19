const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
var tulind = require('../core/tulind');
var _ = require('../core/lodash');
//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');
var fs = require('node:fs');

var settings = config.NOOP;this.settings=settings;

// This method is a noop (it doesn't do anything)

var method = {
init : function(){this.name = 'NOOP';
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1});
},

update : function(candle){_.noop},
log : function(){_.noop},
check : function(candle){_.noop},
end : function() {_.noop}
};

module.exports = method;
