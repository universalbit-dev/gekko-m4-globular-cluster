##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support) -- [Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation) -- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html) -- [Join Mastodon](https://mastodon.social/invite/wTHp2hSD) -- [Website](https://sites.google.com/view/universalbit-dev/home-page) -- [Content Delivery Network](https://universalbitcdn.it/)


#### Snippet code and info links.
* [tulip-indicator](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md)

#### Tulip Node
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.

##### install [tulind npm package](https://www.npmjs.com/package/tulind) from source:
```
npm install tulind --build-from-source
```

### WebSite: [TulipIndicator](https://tulipindicators.org/)

#### [RSI](https://en.wikipedia.org/wiki/Relative_strength_index)
The relative strength index (RSI) is a technical indicator used in the analysis of financial markets. It is intended to chart the current and historical strength or weakness of a stock or market based on the closing prices of a recent trading period. The indicator should not be confused with relative strength.

#### optInTimePeriod Sensible Values: {optInTimePeriod : number}
```
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod :this.settings.rsi });
```

#### [SMA](https://en.wikipedia.org/wiki/Moving_average)
simple moving average (SMA)...is normally taken from an equal number of data on either side of a central value. 
```
this.addTulipIndicator('sma', 'sma', {optInTimePeriod :this.settings.sma });
```

#### [DEMA](https://en.wikipedia.org/wiki/Double_exponential_moving_average)
The Double Exponential Moving Average (DEMA) indicator was introduced in January 1994 by Patrick G. Mulloy, 
in an article in the "Technical Analysis of Stocks & Commodities" magazine: 
"Smoothing Data with Faster Moving Averages".

```
this.addTulipIndicator('dema', 'dema', {optInTimePeriod:this.settings.dema} );
```

#### [ADX](https://en.wikipedia.org/wiki/Average_directional_movement_index)
The ADX is a combination of two other indicators developed by Wilder, the positive directional indicator (abbreviated +DI) and negative directional indicator (-DI).
The ADX combines them and smooths the result with a smoothed moving average.
```
this.addTulipIndicator('adx', 'adx',{optInTimePeriod:this.settings.adx} );
```

#### [BollingerBands](https://en.wikipedia.org/wiki/Bollinger_Bands)
Bollinger Bands are a type of statistical chart characterizing the prices and volatility over time of a financial instrument or commodity, using a formulaic method propounded by John Bollinger in the 1980s.

##### bbands Sensible Values: {optInNbStdDevs:number,optInNbStdDevs:number,optInTimePeriod:number}
```
this.addTulipIndicator('bbands', 'bbands', {optInNbStdDevs: this.settings.nbdevup,optInNbStdDevs:this.settings.nbdevdn,optInTimePeriod:this.settings.bbands});
```

#### Useful info:
```
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
```

#### Add Indicator
```
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod :this.settings.rsi });
this.addTulipIndicator('sma', 'sma', {optInTimePeriod :this.settings.sma });
this.addTulipIndicator('adx', 'adx',{optInTimePeriod:this.settings.adx} );
this.addTulipIndicator('dema', 'dema', {optInTimePeriod:this.settings.dema} );
this.addTulipIndicator('bbands', 'bbands', {optInNbStdDevs: this.settings.nb,optInNbStdDevs:this.settings.nb,optInTimePeriod:this.settings.bbands});
this.addTulipIndicator('ps', 'psar', {optInAcceleration: this.settings.accel,optInMaximum: this.settings.max});
```

#### Indicators result: 
```
rsi=this.tulipIndicators.rsi.result.result;
sma=this.tulipIndicators.sma.result.result;
adx=this.tulipIndicators.adx.result.result;
dema=this.tulipIndicators.dema.result.result;
bbands = this.tulipIndicators.bbands.result;
psar = this.tulipIndicators.ps.result.result;
```

#### Display results
```
if(rsi != undefined)log.info('RSI:',rsi);
if(sma != undefined)log.info('SMA:',sma);
if(adx != undefined)log.info('ADX:',adx);
if(dema != undefined)log.info('DEMA:',dema);
if(bbands != undefined)log.info('BBANDS:',bbands);
if(psar != undefined)log.info('PSAR:',psar);
```
