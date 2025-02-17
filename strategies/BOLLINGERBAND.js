/* copilot explain
This JavaScript file implements a Bollinger Bands trading strategy using the Gekko trading bot framework. Here is a breakdown of the code:

1. **Imports and Initialization**:
   - `log`: Used for logging information.
   - `Wrapper`: A wrapper for strategy rules.
   - `BBANDS`: Imports the Bollinger Bands indicator.

2. **Method Initialization**:
   - `method.init`: Initializes the strategy, setting up variables and adding the Bollinger Bands indicator to the strategy.

3. **Logging Function**:
   - `method.log`: Logs the Bollinger Bands properties (upper, middle, lower bands) for each candle (price data point).

4. **Check Function**:
   - `method.check`: Determines the current price zone (top, high, low, bottom) based on Bollinger Bands and advises whether to go long, short, or hold the position.

This strategy analyzes the price movements in relation to the Bollinger Bands and makes trading decisions based on the defined zones and trends.
*/


/* BB strategy - okibcn 2018-01-03 */

// helpers
var log = require('../core/log.js');
var Wrapper = require('../strategyWrapperRules.js');
var BBANDS = require('./indicators/BBANDS.js');

// let's create our own method
var method = Wrapper;

method.init = function() {
  this.name = '';
  this.nsamples = 0;
  this.trend = {zone: 'none',duration: 0,persisted: false};
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.addIndicator('bbands', 'BBANDS', this.settings.bbands);
}

method.log = function(candle) {
  var BBANDS = this.indicators.bbands;
  log.debug('______________________________________');
  log.debug('calculated BB properties for candle ',this.nsamples);

  if (BBANDS.upper > candle.close) log.debug('\t', 'Upper BB:', BBANDS.upper);
  if (BBANDS.middle > candle.close) log.debug('\t', 'Mid   BB:', BBANDS.middle);
  if (BBANDS.lower >= candle.close) log.debug('\t', 'Lower BB:', BBANDS.lower + '\t' + 'price:' + candle.close);
  if (BBANDS.upper <= candle.close) log.debug('\t', 'Upper BB:', BBANDS.upper);
  if (BBANDS.middle <= candle.close) log.debug('\t', 'Mid   BB:', BBANDS.middle);
  if (BBANDS.lower < candle.close) log.debug('\t', 'Lower BB:', BBANDS.lower + '\t' + 'Band gap: ' + (BBANDS.upper - BBANDS.lower));
}

method.check = function(candle) {
  var BBANDS = this.indicators.bbands;
  var price = candle.close;
  this.nsamples++;
  var zone = 'none';

  if (price >= BBANDS.upper) zone = 'top';
  if ((price < BBANDS.upper) && (price >= BBANDS.middle)) zone = 'high';
  if ((price > BBANDS.lower) && (price < BBANDS.middle)) zone = 'low';
  if (price <= BBANDS.lower) zone = 'bottom';
  log.debug('current zone:  ',zone);

  if (this.trend.zone == zone){
    log.debug('persisted');
	this.trend = {zone: zone,duration: this.trend.duration+1,persisted: true}
	this.advice();
  }
  else {
    log.debug('Leaving zone: ',this.trend.zone)
  	if (this.trend.zone == 'top') this.advice('short');
  	if (this.trend.zone == 'bottom') this.advice('long');
 	if (this.trend.zone == 'high') this.advice();
  	if (this.trend.zone == 'low') this.advice();
   	this.trend = {zone: zone,duration: 0,persisted: false}
  }
}

module.exports = method;
