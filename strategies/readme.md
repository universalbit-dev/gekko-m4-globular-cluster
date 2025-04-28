# Strategies Documentation

This document provides guidance and references for implementing strategies in the Gekko-M4 Globular Cluster project. It includes useful links, examples, and debugging tips to help you create and optimize strategies effectively.

---

## Support and Resources

- [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)  
  Learn how to contribute and support the UniversalBit ecosystem.
- [Disambiguation (Wikipedia)](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation)  
  Overview of disambiguation in various contexts.

---

## Technical References

### Tulip Indicators
Tulip Indicators provide over 100 technical analysis functions like moving averages, Bollinger Bands, MACD, and more.

- [Tulip-Indicator Documentation](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md)
- [Official Tulip Indicator Website](https://tulipindicators.org/)
- Install the Tulind package using NPM:
  ```bash
  npm install tulind --save
  ```

### Gekko Indicators Engine
Gekko's Indicators Engine supports various technical indicators for strategy development.

- [Indicators Overview](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/indicators)
- [Short Description of Indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/indicators.md)

---

## Usage Examples

### Adding Financial Indicators
You can integrate technical indicators into your strategy using the following examples:
```javascript
this.addTulipIndicator('rsi', 'rsi', { optInTimePeriod: this.settings.rsi });
this.addTulipIndicator('sma', 'sma', { optInTimePeriod: this.settings.sma });
this.addTulipIndicator('adx', 'adx', { optInTimePeriod: this.settings.adx });
this.addTulipIndicator('dema', 'dema', { optInTimePeriod: this.settings.dema });
this.addTulipIndicator('bbands', 'bbands', { optInNbStdDevs: this.settings.nb, optInTimePeriod: this.settings.bbands });
this.addTulipIndicator('ps', 'psar', { optInAcceleration: this.settings.accel, optInMaximum: this.settings.max});
```

- Example settings: [RSIBullBearADX Simulator](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/env/simulator/trade_rsibullbearadx_simulator.js)
- Additional examples: [Trade Environment](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/env/simulator)

---

## Financial Indicator Results
The results of the indicators can be accessed as follows:
```javascript
rsi = this.tulipIndicators.rsi.result.result;
sma = this.tulipIndicators.sma.result.result;
adx = this.tulipIndicators.adx.result.result;
dema = this.tulipIndicators.dema.result.result;
bbands = this.tulipIndicators.bbands.result;
psar = this.tulipIndicators.ps.result.result;
```

---

## Debugging Indicator Results
Debugging your indicator calculations can be done with the following code:
```javascript
if (rsi !== undefined) { console.debug('RSI:', rsi); }
if (sma !== undefined) { console.debug('SMA:', sma); }
if (adx !== undefined) { console.debug('ADX:', adx); }
if (dema !== undefined) { console.debug('DEMA:', dema); }
if (bbands !== undefined) { console.debug('BBANDS:', bbands); }
if (psar !== undefined) { console.debug('PSAR:', psar); }
```

---

## Stay motivated while working on your strategies!
```javascript
log.info('================================================');
log.info('Keep calm and create something amazing!');
log.info('================================================');
```

---
