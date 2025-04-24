# AsyncIndicatorRunner

`AsyncIndicatorRunner` is a utility class designed for managing asynchronous processing of financial indicators using the TA-Lib and Tulip libraries. This class is essential for applications that rely on sequential and efficient indicator computation, particularly in trading or financial analysis contexts.

## Key Features

- **Candle Data Management**:
  - Maintains a cache of the most recent candles for indicator computation.
  - Processes incoming candle data sequentially, ensuring no overlapping calculations.
- **Indicator Support**:
  - Provides support for TA-Lib and Tulip indicators.
  - Enforces the usage of only allowed indicators.
  - Allows the addition of custom TA-Lib and Tulip indicators during initialization.
- **Asynchronous Computation**:
  - Handles computation of indicators asynchronously.
  - Processes candles from a backlog when multiple candles are queued.

## Installation and Requirements

Ensure that TA-Lib and Tulip libraries are available and properly configured in your environment.

## Usage

1. **Initialization**:
   Create an instance of `AsyncIndicatorRunner`.

2. **Adding Indicators**:
   - Use `addTalibIndicator(name, type, parameters)` to add a TA-Lib indicator.
   - Use `addTulipIndicator(name, type, parameters)` to add a Tulip indicator.

3. **Processing Candle Data**:
   - Use `processCandle(candle, next)` to queue and compute indicators for a candle.
   - The function processes candles sequentially and computes the results asynchronously.

4. **Extensibility**:
   - Integrate `AsyncIndicatorRunner` with trading strategies or other financial applications.

### Example Workflow

```javascript
const AsyncIndicatorRunner = require('./asyncIndicatorRunner');

// Create an instance
const runner = new AsyncIndicatorRunner();

// Add indicators
runner.addTalibIndicator('sma', 'sma', [10]); // Example of adding a TA-Lib indicator
runner.addTulipIndicator('ema', 'ema', [20]); // Example of adding a Tulip indicator

// Process a candle
const sampleCandle = {
  open: 100,
  high: 105,
  low: 95,
  close: 102,
  volume: 1000
};

runner.processCandle(sampleCandle, () => {
  console.log('Candle processed');
});
```

## Class Methods

### `processCandle(candle, next)`
Queuing and processing a candle for indicator calculation.

- **Parameters**:
  - `candle`: An object containing `open`, `high`, `low`, `close`, and `volume` properties.
  - `next`: A callback function to execute after processing.

- **Behavior**:
  - If processing is already in progress, the candle is added to a backlog.
  - Processes the candle and calculates indicators.

---

### `calculateIndicators(next)`
Handles the computation of indicators for the current candle.

- **Parameters**:
  - `next`: A callback function to execute after indicator calculation.

- **Behavior**:
  - Computes results for both TA-Lib and Tulip indicators.
  - Executes the `next` callback after all computations are completed.

---

### `addTalibIndicator(name, type, parameters)`
Adds a new TA-Lib indicator.

- **Parameters**:
  - `name`: The name to associate with the indicator.
  - `type`: The type of TA-Lib indicator to add.
  - `parameters`: An array of parameters for the indicator.

- **Errors**:
  - Throws an error if TA-Lib is not enabled or the indicator type is not allowed.

---

### `addTulipIndicator(name, type, parameters)`
Adds a new Tulip indicator.

- **Parameters**:
  - `name`: The name to associate with the indicator.
  - `type`: The type of Tulip indicator to add.
  - `parameters`: An array of parameters for the indicator.

- **Errors**:
  - Throws an error if Tulip is not enabled or the indicator type is not allowed.

---

### `handlePostFlight(next)`
Manages the state after processing a candle.

- **Parameters**:
  - `next`: A callback function to execute after processing.

- **Behavior**:
  - Processes the next candle in the backlog, if any.

## License

This module is licensed under the MIT License. Copyright 2014-2017 Mike van Rossum.
