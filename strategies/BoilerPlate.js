// BoilerPlate Strategy
require('../core/tulind');
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
