# BaseTradingMethod.js

The `BaseTradingMethod.js` module is a core component of the Gekko trading framework. It defines the `Base` class, which provides foundational functionality for creating custom trading strategies. This module handles key aspects of strategy execution, including managing indicators, processing market data, and emitting events.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Usage](#usage)
- [Class Details](#class-details)
  - [Properties](#properties)
  - [Methods](#methods)
- [License](#license)

---

## Overview

The `Base` class in this module provides a foundation for implementing trading strategies within the Gekko framework. Strategies inherit from this class and implement core methods (`init` and `check`) to define their behavior.

---

## Key Features

- **Dynamic Indicator Management**:
  - Loads indicators from a configurable directory.
  - Supports both synchronous and asynchronous indicators.

- **Real-Time Market Data Processing**:
  - Handles incoming candles and generates trading advice.

- **Event-Based Strategy Lifecycle**:
  - Emits and listens to events like `stratUpdate`, `advice`, and `stratNotification`.

- **Default Implementations**:
  - Provides default methods for `update`, `end`, and `onTrade`, which can be customized by the strategy.

- **Warm-Up Mechanism**:
  - Ensures the strategy is properly initialized before executing.

---

## Usage

To create a custom trading strategy, extend the `Base` class and implement the required methods:

- `init`: Strategy initialization logic.
- `check`: Strategy logic for analyzing data and generating advice.

Other optional methods like `update`, `end`, and `onTrade` can be overridden to customize behavior.

### Example
```javascript
const Base = require('./baseTradingMethod');

class MyStrategy extends Base {
  init() {
    // Initialize strategy-specific properties
    this.addIndicator('myIndicator', 'SMA', { period: 10 });
  }

  check(candle) {
    // Trading logic
    const result = this.indicators.myIndicator.result;

    if (result > candle.close) {
      this.advice('short');
    } else {
      this.advice('long');
    }
  }
}

module.exports = MyStrategy;
```

---

## Class Details

### Properties

- `age`: Tracks the number of candles processed.
- `processedTicks`: The number of ticks processed so far.
- `setup`: Indicates whether the strategy is fully initialized.
- `settings`: Strategy-specific settings.
- `tradingAdvisor`: Configuration for the trading advisor.
- `priceValue`: The price field to use when calculating indicators (default: `'open'`).
- `indicators`: An object holding indicator instances.
- `asyncTick`: Indicates whether the strategy uses asynchronous indicators.
- `deferredTicks`: Stores deferred candles for asynchronous processing.
- `requiredHistory`: The number of candles required for the strategy to start.
- `propogatedAdvices`: Tracks the number of trading advices issued.
- `_currentDirection`: The current trading direction (`long` or `short`).

---

### Methods

#### Constructor

`Base(settings)`

- Initializes the `Base` class with the provided settings.
- Validates the presence of required methods (`init` and `check`).
- Dynamically loads indicators.

#### `tick(candle, done)`

- Processes a single candle and updates indicators.
- Emits events and executes the `check` method.

#### `isBusy()`

- Returns whether the strategy is busy with asynchronous operations.

#### `calculateSyncIndicators(candle, done)`

- Updates all synchronous indicators for the given candle.

#### `propogateTick(candle)`

- Executes the strategy logic for each tick.
- Emits events and ensures the strategy is warmed up before processing.

#### `processTrade(trade)`

- Handles trade events and updates the strategy's state.

#### `addTulipIndicator(name, type, parameters)`

- Adds an asynchronous Tulip indicator.

#### `addIndicator(name, type, parameters)`

- Adds a synchronous indicator. Should only be called during `init`.

#### `advice(newDirection)`

- Issues trading advice (`long` or `short`).
- Supports trailing stop triggers.

#### `notify(content)`

- Emits a notification event with the provided content.

#### `finish(done)`

- Finalizes the strategy after all candles are processed.

---

## License

This module is licensed under the MIT License. Copyright 2014-2017 Mike van Rossum.
