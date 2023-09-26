// DMI coded by Gab0 04/14/2018;
//settings: period;
//sidlines are equivalent of plus_dm and minus_dm from TALib
//    should maybe be like plus_di and minus_di?
// that case just change dm_up to di_up on this code, also with _down;
let _ = require('../../core/lodash');
let util = require('../../core/util');
let config = util.getConfig();
let log = require('../../core/log.js');

var ADX = require('./ADX');

var Indicator = function (period) {
    this.input = 'candle';
    this.ADX = new ADX(period);
    this.age = 0;
    _.bindAll(this, _.functionsIn(this));
}

Indicator.prototype.update = function (candle) {
    this.ADX.update(candle);
    this.result = this.ADX.result;
    this.DIup = this.ADX.dx.dm_up;
    this.DIdown = this.ADX.dx.dm_down;
    this.age++;
}

module.exports = Indicator;
