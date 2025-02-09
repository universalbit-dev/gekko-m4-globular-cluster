##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support) -- [Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation) -- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html) -- [Join Mastodon](https://mastodon.social/invite/wTHp2hSD) -- [Website](https://sites.google.com/view/universalbit-dev/home-page) -- [Content Delivery Network](https://universalbitcdn.it/)


#### Snippet code and info links.
* [tulip-indicator](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md)

#### Tulip Node
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.
##### install [Tulind Package](https://www.npmjs.com/package/tulind)
```
npm install tulind --save
```
* [TulipIndicator](https://tulipindicators.org/)

#### Gekko Indicators Engine
* [Indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/indicators)

#### Useful info:
```
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
```

#### Examples:
Add financial indicators:
```
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod :this.settings.rsi });
this.addTulipIndicator('sma', 'sma', {optInTimePeriod :this.settings.sma });
this.addTulipIndicator('adx', 'adx',{optInTimePeriod:this.settings.adx} );
this.addTulipIndicator('dema', 'dema', {optInTimePeriod:this.settings.dema} );
this.addTulipIndicator('bbands', 'bbands', {optInNbStdDevs: this.settings.nb,optInNbStdDevs:this.settings.nb,optInTimePeriod:this.settings.bbands});
this.addTulipIndicator('ps', 'psar', {optInAcceleration: this.settings.accel,optInMaximum: this.settings.max});
```
* settings: [example](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/env/trade/trade_rsibullbearadx_simulator.js)
* [examples](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/env/trade)

#### Results of financial indicators
```
rsi=this.tulipIndicators.rsi.result.result;
sma=this.tulipIndicators.sma.result.result;
adx=this.tulipIndicators.adx.result.result;
dema=this.tulipIndicators.dema.result.result;
bbands = this.tulipIndicators.bbands.result;
psar = this.tulipIndicators.ps.result.result;
```
#### Debug results
```
if(rsi != undefined){console.debug('RSI:',rsi);}
if(sma != undefined){console.debug('SMA:',sma);}
if(adx != undefined){console.debug('ADX:',adx);}
if(dema != undefined){console.debug('DEMA:',dema);}
if(bbands != undefined){console.debug('BBANDS:',bbands);}
if(psar != undefined){console.debug('PSAR:',psar);}
//
```
