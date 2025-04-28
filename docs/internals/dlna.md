# DLNA Module Documentation

## Overview

The `dlna.js` file defines a `Dlna` class that extends the `Readable` stream and integrates various modules to manage market data and create candles.

---

## Features

1. **Dependencies**:
   - Utilizes the following modules:
     - `underscore`
     - `events`
     - `util`
     - `Heart` (custom module)
     - `MarketDataProvider` (custom module)
     - `CandleManager` (custom module)
   
2. **Dlna Constructor**:
   - Binds all functions to the instance using `_.bindAll`.
   - Initializes internal modules:
     - `Heart`
     - `MarketDataProvider`
     - `CandleManager`
   - Sets up event listeners to relay market events (`marketUpdate` and `marketStart`).
   - Outputs candles through `CandleManager`.
   - Retrieves trade data on every tick from `Heart`.
   - Processes trades to create candles.

3. **Stream Implementation**:
   - Extends the `Readable` stream.
   - Implements a no-operation `_read` function.
   - Defines `pushCandles` to push candle data to the stream.

---

## Code Breakdown

### Constructor Implementation
```javascript
var Dlna = function(config) {
  EventEmitter.call(this);
  _.bindAll(this,_.functions(this));
  Readable.call(this, {objectMode: true});

  // Internal modules
  this.heart = new Heart;
  this.marketDataProvider = new MarketDataProvider(config);
  this.candleManager = new CandleManager;

  // Data flow setup
  this.marketDataProvider.on('marketUpdate',e => this.emit('marketUpdate',e));
  this.marketDataProvider.on('marketStart',e => this.emit('marketStart',e));
  this.candleManager.on('candles', this.pushCandles);
  this.heart.on('tick', this.marketDataProvider.retrieve);
  this.marketDataProvider.on('trades', this.candleManager.processTrades);

  this.heart.pump();
}
```

### Stream Integration
The `Dlna` class extends the `Readable` stream:

```javascript
Dlna.prototype = Object.create(Readable.prototype, { constructor: { value: Dlna } });
Dlna.prototype._read = function noop() {};
Dlna.prototype.pushCandles = function(candles) { _.each(candles, this.push); };
```

---

## License

The DLNA module is provided under the MIT License.

---
