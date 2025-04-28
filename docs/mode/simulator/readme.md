# Exchange Simulator for Gekko M4

The Exchange Simulator module in Gekko M4 provides a simulated trading environment for testing strategies, debugging, and analyzing performance without relying on live market data. It replicates exchange behavior, enabling seamless integration for backtesting and real-time simulations.

---

## Overview

The Exchange Simulator is designed to:
- Mimic the behavior of real exchange APIs.
- Provide a controlled environment for testing strategies.
- Simulate trades, market trends, and candlestick data.
- Support integration with plugins like the Paper Trader for portfolio management and performance tracking.

---

## Features

### Simulated Exchange Operations
- **Trade Simulation**: Generates virtual buy and sell trades with randomized prices and volumes.
- **OHLCV Data**: Creates Open-High-Low-Close-Volume (OHLCV) candles based on simulated trades.
- **Trend Emulation**: Incorporates Fibonacci sequence-based trend changes for realistic market behavior.

### Portfolio Management
- **Initial Balances**: Provides predefined balances for assets and currencies.
- **Price Validation**: Ensures trade prices are valid and resets to defaults if issues arise.

### Modular Design
- **Candle Creator**: Processes trades to generate candlesticks for analysis.
- **Error Handling**: Includes robust mechanisms to manage price calculation and fetch errors.

---

## Configuration
### Trend Customization
- The simulator uses Fibonacci sequence intervals to alternate market trends (`up` or `down`).

---

## Core Functionalities

### Trade Simulation
- **Generate Trades**:
  - Randomizes price changes and trade volumes.
  - Emits fake trades at consistent intervals.
- **Trend Switching**:
  - Adjusts trends at Fibonacci sequence intervals.

### Candlestick Generation
- **Calculate Candles**:
  - Processes trades to derive OHLCV data for defined timeframes.
- **Custom Intervals**:
  - Supports variable intervals for candlestick creation.

### Error Handling
- **Price Validation**:
  - Resets invalid prices to defaults.
- **Fetch Errors**:
  - Logs errors and provides fallback mechanisms.

### Event Emission
- Emits logs for trade generation and candlestick processing.

---

## Integration with Paper Trader

The Exchange Simulator works seamlessly with the Paper Trader plugin to:
- Simulate trades based on strategy advice.
- Track portfolio changes and calculate performance metrics.
- Emulate realistic trading environments with fees and stop-loss triggers.

For more details, refer to the [Paper Trader Documentation](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/paperTrader/paperTrader.md).

---

## Example Usage

### Simulated Trade Log
```bash
[EXCHANGE SIMULATOR] emitted 10 fake trades, up until 2024-11-30 02:12:54.
[EXCHANGE SIMULATOR] emitted 15 fake trades, up until 2024-11-30 02:13:34.
```

### Example Candlestick Data
```json
{
  "open": 10,
  "high": 12,
  "low": 9,
  "close": 11,
  "vwp": 10.5,
  "volume": 50
}
```

---
