// BoilerPlate Strategy
require('../core/tulind');

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var sequence = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function sequence() {console.log('');await sequence;};

/* async keep calm and make something of amazing */ 
var keepcalm = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;};

var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var settings = config.yoursettings;this.settings=settings;

var method = {};

method.init = function() {}
method.update = function(candle) {}
method.log = function() {}
method.check = function(candle) {}
method.end = function() {}
module.exports = method;
