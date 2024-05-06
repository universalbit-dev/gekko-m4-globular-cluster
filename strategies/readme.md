* [UniversalBit-Dev](https://github.com/universalbit-dev/gekko-m4)
* [Support](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)

#### Snippet code and info links.

#### [Tulip Node](https://www.npmjs.com/package/tulind)
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.

##### install tulind npm package from source:
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
this.addTulipIndicator('bbands', 'bbands', {optInNbStdDevs: this.settings.nb,optInNbStdDevs:this.settings.nb,optInTimePeriod:this.settings.bbands});
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
```

#### Indicators result: 
```
rsi=this.tulipIndicators.rsi.result.result;
sma=this.tulipIndicators.sma.result.result;
adx=this.tulipIndicators.adx.result.result;
dema=this.tulipIndicators.dema.result.result;
bbands = this.tulipIndicators.bbands.result;
```

#### Display results
```
if(rsi != undefined)log.info('RSI:',rsi);
if(sma != undefined)log.info('SMA:',sma);
if(adx != undefined)log.info('ADX:',adx);
if(dema != undefined)log.info('DEMA:',dema);
if(bbands != undefined)log.info('BBANDS:',bbands);
```

##### Gekko Async Indicator Runner an incredible [porting](https://en.wikipedia.org/wiki/Porting) job
async indicators are in the /strategies/indicators directory:

* [ADX](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/ADX.js)
* [AO](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/AO.js)
* [ATR](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/ATR.js)
* [BBANDS](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/BBANDS.js)
* [CCI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/CCI.js)
* [DEMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/DEMA.js)
* [DI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/DI.js)
* [DMI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/DMI.js)
* [DPO](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/DPO.js)
* [DX](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/DX.js)
* [EMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/EMA.js)
* [EMV](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/EMV.js)
* [HMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/HMA.js)
* [IFTCCI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/IFTCCI.js)
* [LRC](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/LRC.js)
* [MACD](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/MACD.js)
* [MFI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/MFI.js)
* [PDO](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/PDO.js)
* [PPO](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/PPO.js)
* [ROC](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/ROC.js)
* [RSI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/RSI.js)
* [SMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/SMA.js)
* [SMMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/SMMA.js)
* [STC](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/STC.js)
* [STOCH](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/STOCH.js)
* [StopLoss](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/StopLoss.js)
* [TEMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/TEMA.js)
* [TRANGE](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/TRANGE.js)
* [TRIX](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/TRIX.js)
* [TSI](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/TSI.js)
* [TulipAsync](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/TulipAsync.js)
* [UO](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/UO.js)
* [WMA](https://github.com/universalbit-dev/gekko-m4/blob/master/strategies/indicators/WMA.js)













