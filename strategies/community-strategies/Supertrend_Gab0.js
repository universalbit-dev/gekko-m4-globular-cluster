/* copilot explain
This JavaScript code defines a trading strategy for the Gekko trading bot, specifically implementing a Supertrend indicator. Here's a breakdown of the code:

    Imports and Variable Declarations:
        The code imports a logging module.
        It defines an empty strategy object method.

    Initialization Function (method.init):
        Sets the required history size for the strategy.
        Adds an Average True Range (ATR) indicator with settings for exponential moving average (EMA).
        Initializes variables to keep track of the Supertrend bands and the last candle close price.
        Initializes a bought flag to track whether a position has been taken.

    Update Function (method.update):
        This function is called on every new candle, but it is currently empty and can be customized as needed.

    Log Function (method.log):
        This function is used for debugging purposes but is currently empty.

    Check Function (method.check):
        This function is called on every new candle to decide whether to buy or sell.
        Calculates the upper and lower basic bands using the ATR result and a band factor setting.
        Adjusts the upper and lower bands based on the previous Supertrend values and the last candle's close price.
        Determines the current Supertrend value based on the calculated bands and the last Supertrend value.
        Issues a "long" advice (buy) if the candle close price is above the Supertrend and no position is currently held.
        Issues a "short" advice (sell) if the candle close price is below the Supertrend and a position is currently held.
        Updates the last candle close price and the last Supertrend values for the next iteration.

The strategy essentially uses the Supertrend indicator to decide when to buy or sell based on the market trends and price movements.
*/

// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/Gab0/gekko-adapted-strategies

// Let's create our own strategy
var log = require('../core/log.js');

var method = {};

// Prepare everything our strat needs
method.init = function() {
  // your code!
  this.requiredHistory = this.tradingAdvisor.historySize;

  this.addIndicator("myAtr", "ATR", this.settings.atrEma);
  this.bought = 0;

  this.supertrend = {
      upperBandBasic : 0,
      lowerBandBasic : 0,
      upperBand : 0,
      lowerBand : 0,
      supertrend : 0,
  };
  this.lastSupertrend = {
      upperBandBasic : 0,
      lowerBandBasic : 0,
      upperBand : 0,
      lowerBand : 0,
      supertrend : 0,
  };
  this.lastCandleClose = 0;
}

// What happens on every new candle?
method.update = function(candle) {
  // your code!
}

// For debugging purposes.
method.log = function() {
  // your code!
}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {
  
  var atrResult = this.indicators.myAtr.result;  

  this.supertrend.upperBandBasic = ((candle.high + candle.low) / 2) + (this.settings.bandFactor * atrResult);
  this.supertrend.lowerBandBasic = ((candle.high + candle.low) / 2) - (this.settings.bandFactor * atrResult);

  if(this.supertrend.upperBandBasic < this.lastSupertrend.upperBand || this.lastCandleClose > this.lastSupertrend.upperBand)
    this.supertrend.upperBand = this.supertrend.upperBandBasic; 
  else
    this.supertrend.upperBand = this.lastSupertrend.upperBand;

  if(this.supertrend.lowerBandBasic > this.lastSupertrend.lowerBand || this.lastCandleClose < this.lastSupertrend.lowerBand)
    this.supertrend.lowerBand = this.supertrend.lowerBandBasic; 
  else
    this.supertrend.lowerBand = this.lastSupertrend.lowerBand;

  if(this.lastSupertrend.supertrend == this.lastSupertrend.upperBand && candle.close <= this.supertrend.upperBand)
    this.supertrend.supertrend = this.supertrend.upperBand;
  else if(this.lastSupertrend.supertrend == this.lastSupertrend.upperBand && candle.close >= this.supertrend.upperBand)
    this.supertrend.supertrend = this.supertrend.lowerBand;
  else if(this.lastSupertrend.supertrend == this.lastSupertrend.lowerBand && candle.close >= this.supertrend.lowerBand)
    this.supertrend.supertrend = this.supertrend.lowerBand;
  else if(this.lastSupertrend.supertrend == this.lastSupertrend.lowerBand && candle.close <= this.supertrend.lowerBand)
    this.supertrend.supertrend = this.supertrend.upperBand;
  else
    this.supertrend.supertrend = 0

  if(candle.close > this.supertrend.supertrend && this.bought == 0){
    this.advice("long");
    this.bought = 1;
    log.debug("Buy at: ", candle.close);
  }

  if(candle.close < this.supertrend.supertrend && this.bought == 1){
    this.advice("short")
    this.bought = 0;
    log.debug("Sell at: ", candle.close);
  }

  this.lastCandleClose = candle.close;
  this.lastSupertrend = {
    upperBandBasic : this.supertrend.upperBandBasic,
    lowerBandBasic : this.supertrend.lowerBandBasic,
    upperBand : this.supertrend.upperBand,
    lowerBand : this.supertrend.lowerBand,
    supertrend : this.supertrend.supertrend,
  };
}

module.exports = method;

