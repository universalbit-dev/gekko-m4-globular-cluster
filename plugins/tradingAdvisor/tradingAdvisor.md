# Trading Advisor Module Documentation

The `tradingAdvisor.js` file in the `gekko-m4-globular-cluster` repository is responsible for managing the trading strategy and advising on trades based on the configured strategy. This document provides an overview of its features, functionality, and use cases.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Imports and Initialization](#imports-and-initialization)
  - [Constructor](#constructor)
  - [setupStrategy](#setupstrategy)
  - [processCandle](#processcandle)
  - [emitStratCandle](#emitstratcandle)
  - [processTradeCompleted](#processtradecompleted)
  - [finish](#finish)
  - [relayAdvice](#relayadvice)
- [Event Listeners](#event-listeners)
- [Use Cases](#use-cases)
- [Related Files](#related-files)

---

## Overview

The `tradingAdvisor.js` is a crucial component of the Gekko trading bot that handles the logic for connecting trading strategies to incoming market data. It supports real-time and historical data processing, offering a modular and configurable approach to trading strategy management.

---

## Features

### Imports and Initialization

- **Modules Imported**:
  - `underscore`: For utility functions.
  - `events`: For event-driven programming.
  - `fs-extra`: For file system operations.
  - `util`: For utility functions specific to Gekko.
  - `moment`: For date and time handling.
  - `log`: For logging.

- **Initialization**:
  - Configures directories and settings using `util`.
  - Defines the `Actor` class, which extends `EventEmitter` to handle events.

---

### Constructor

- **Purpose**:
  The constructor initializes the trading advisor module, binds functions to the `this` context, and sets up the strategy.

- **Key Features**:
  - Binds all methods to the `this` context using `_.bindAll`.
  - Initializes a `CandleBatcher` with the configured candle size.
  - Calls `this.setupStrategy()` to prepare the trading strategy.
  - Prepares historical data for real-time execution using `dataStitcher`.

---

### setupStrategy

- **Purpose**:
  Sets up the trading strategy file and initializes it with configuration settings.

- **Key Features**:
  - Checks if the strategy file exists and requires it dynamically.
  - Wraps strategy methods into a `WrappedStrategy` class.
  - Sets up event listeners for:
    - `stratWarmupCompleted`
    - `advice`
    - `stratUpdate`
    - `stratNotification`
    - `tradeCompleted`

---

### processCandle

- **Purpose**:
  Handles incoming market candles and processes them through the strategy.

- **Key Features**:
  - Writes the incoming candle to the batcher.
  - Emits the processed candle to the strategy for analysis.

---

### emitStratCandle

- **Purpose**:
  Propagates custom-sized candles to the trading strategy.

---

### processTradeCompleted

- **Purpose**:
  Processes a completed trade by calling the `processTrade` method in the strategy.

---

### finish

- **Purpose**:
  Cleans up resources by calling the strategy's `finish` method.

---

### relayAdvice

- **Purpose**:
  Relays trading advice emitted by the strategy.

- **How It Works**:
  Emits an `advice` event with the strategy's recommendation.

---

## Event Listeners

- **`stratWarmupCompleted`**: Triggered when the strategy's warmup phase is complete.
- **`advice`**: Provides trading advice (buy/sell/hold).
- **`stratUpdate`**: Updates the strategy with relevant information.
- **`stratNotification`**: Sends notifications from the strategy.
- **`tradeCompleted`**: Signals that a trade has been completed.

---

## Use Cases

- **Live Trading**:
  - Connects real-time market data to the strategy for actionable advice.
- **Backtesting**:
  - Runs historical data through the strategy to evaluate performance.
- **Strategy Development**:
  - Allows developers to plug in their custom strategies for testing and deployment.

---

## Related Files

- **`config.js`**: Contains configuration options for the trading advisor.
- **`WrappedStrategy.js`**: Provides the wrapper for strategy methods.
- **`CandleBatcher.js`**: Handles batching of market candles.

## License

This module is licensed under the MIT License. Copyright 2014-2017 Mike van Rossum.

---

This documentation is designed to help developers and users better understand and utilize the `tradingAdvisor.js` module in the Gekko M4 trading bot.
