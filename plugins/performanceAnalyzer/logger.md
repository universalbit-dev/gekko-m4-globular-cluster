# Logger Module Documentation

This document explains the functionality of the `logger.js` module, which is part of the `performanceAnalyzer` plugin in the `gekko-m4-globular-cluster` repository.

## Overview

The `logger.js` module is designed to log trade performance results. It provides functionality for both real-time and backtesting modes. The module uses external libraries and utilities to process and display performance metrics.

---

## Dependencies

The module imports the following libraries and utility functions:

- **`underscore`**: Used for utility functions like binding methods.
- **`moment`**: For date-time manipulation and formatting.
- **`humanize-duration`**: To convert durations into human-readable formats.
- **`../../core/log.js`**: A custom logging utility of the system.
- **`../../core/util.js`**: A utility module to fetch configurations and other helper methods.

---

## Logger Class

### Constructor

The `Logger` class is initialized with a `watchConfig` object, which includes:

- `currency`: The currency being monitored.
- `asset`: The asset being monitored.

Additionally, it initializes an empty array `roundtrips` to store roundtrip trade information.

### Event Emitter

The `Logger` class is extended to function as an event emitter using the `util.makeEventEmitter` method.

---

### Key Methods

#### 1. `round(amount)`

- Rounds a given numeric amount to 8 decimal places.

#### 2. `logReport(trade, report)`

- Logs the performance report, including:
  - Original balance
  - Current balance
  - Profit in absolute terms and percentage terms

#### 3. `logRoundtripHeading()`

- Logs the header for roundtrip data, including:
  - Entry and exit dates (UTC)
  - Exposed duration
  - Profit and loss (P&L)
  - Profit percentage

#### 4. `logRoundtrip(rt)`

- Logs data for a single roundtrip, including:
  - Entry and exit times
  - Duration of exposure
  - Profit and loss
  - Profit percentage

#### 5. `handleTrade(trade)`

- Logs simulated trades during backtesting mode. Handles both `buy` and `sell` actions.

#### 6. `finalize(report)`

- Logs a summary report after backtesting:
  - Start and end times
  - Duration of the backtest
  - Exposure and market performance
  - Number of trades
  - Performance statistics (e.g., yearly profit, Sharpe ratio)

#### 7. `handleRoundtrip(rt)`

- Adds a roundtrip to the `roundtrips` array in backtesting mode.

---

## Mode-Specific Behavior

The logger supports two modes:

1. **Backtesting Mode**:
   - Logs simulated trades (`handleTrade`).
   - Logs a detailed summary report at the end of the backtest (`finalize`).
   - Tracks roundtrips.

2. **Realtime Mode**:
   - Logs reports in real-time.
   - Logs individual roundtrips as they occur.

---

## Export

The module exports the `Logger` class for use in other parts of the system.

---

## License

The code is licensed under the MIT License (MIT). See the license header in the source file for details.

---
