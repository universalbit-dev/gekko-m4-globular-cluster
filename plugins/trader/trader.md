# Trader Module Documentation

The `trader.js` file in the `universalbit-dev/gekko-m4-globular-cluster` repository is responsible for managing trading operations for the Gekko trading bot. This document provides an overview of its key components, functionality, and usage.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Imports and Initialization](#imports-and-initialization)
  - [Trader Constructor](#trader-constructor)
  - [Synchronization](#synchronization)
  - [Portfolio and Balance Management](#portfolio-and-balance-management)
  - [Processing Candles and Advice](#processing-candles-and-advice)
  - [Order Management](#order-management)
- [Event Listeners](#event-listeners)
- [Use Cases](#use-cases)
- [Related Files](#related-files)

---

## Overview

The `trader.js` module manages trading logic, including handling advice, creating and canceling orders, and maintaining synchronization with the broker. It works closely with the broker and other modules to ensure efficient and accurate trading operations.

---

## Features

### Imports and Initialization

- **Modules Imported**:
  - `lodash`: For utility functions.
  - `util`: For general utility methods.
  - `moment`: For date and time handling.
  - `log`: For logging.
  - `Broker`: For broker interactions.

- **Initialization**:
  - Configures the broker using `config.trader` and `config.watch`.

---

### Trader Constructor

- **Purpose**:
  Initializes the Trader object, binds its methods, and sets up the broker.

- **Key Features**:
  - Verifies broker capabilities for `gekkoBroker`.
  - Logs initial portfolio and balance information.
  - Schedules periodic data synchronization every 10 minutes.

---

### Synchronization

- **Purpose**:
  Updates the trader's private data, portfolio, and balance.

- **Key Features**:
  - The `sync` method ensures data is up-to-date.
  - Triggers portfolio change events when the initial portfolio changes.

---

### Portfolio and Balance Management

- **Methods**:
  - `setPortfolio`: Updates the trader's portfolio with the current balances of currency and asset.
  - `setBalance`: Calculates the total balance and exposure based on the portfolio and current price.

---

### Processing Candles and Advice

- **Methods**:
  - `processCandle`: Updates the current price based on candle data and adjusts the portfolio and balance accordingly.
  - `processAdvice`: Handles buy and sell advice, creating or canceling orders as needed.

---

### Order Management

- **Methods**:
  - `createOrder`: Creates a new order based on advice and validates it.
  - `onStopTrigger`: Handles the firing of a trailing stop trigger.
  - `cancelOrder`: Cancels an existing order and synchronizes the data.

---

## Event Listeners

- **`portfolioChange`**: Triggered when the portfolio changes.
- **`portfolioValueChange`**: Triggered when the portfolio value changes.
- **`tradeInitiated`**: Signals the start of a trade.
- **`tradeCompleted`**: Signals the completion of a trade.
- **`tradeErrored`**: Signals an error during a trade.
- **`triggerCreated`**: Signals the creation of a trailing stop trigger.
- **`triggerFired`**: Signals the firing of a stop trigger.
- **`tradeCancelled`**: Signals the cancellation of a trade.

---

## Use Cases

- **Live Trading**:
  - Executes trades based on real-time market data and advice.
- **Order Management**:
  - Manages the lifecycle of orders, including creation, validation, and cancellation.
- **Portfolio Updates**:
  - Keeps the portfolio and balance synchronized with the broker's data.

---

## Related Files

- **`broker.js`**: Handles communication with the trading broker.
- **`config.js`**: Contains configuration options for the Trader module.
- **`tradeExecutor.js`**: Facilitates execution of trades and handles order-related actions.

---

This documentation is designed to help developers and users better understand and utilize the `trader.js` module in the Gekko M4 trading bot.
