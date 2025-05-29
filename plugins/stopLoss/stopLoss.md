# Stop Loss Plugin Documentation

The Stop Loss plugin for Gekko automatically halts trading when a predefined loss threshold is reached. This safety feature helps protect your portfolio by preventing further losses beyond your specified limit.

---

## Overview

The Stop Loss plugin is designed to:

- Monitor your trading performance in real-time or during backtests.
- Automatically stop all trading activity when your set loss threshold is met.
- Protect your capital from further downside during adverse market moves.

---

## Key Features

- **Automated Loss Monitoring**: Continuously tracks your portfolio loss.
- **Threshold-Based Stop**: Instantly halts trading once your defined loss limit is reached.
- **Integration**: Works alongside other trading and analysis plugins.
- **Event Emission**: Can emit events when thresholds are triggered.

---

## Configuration

Typical configuration parameters:

1. **Enable Stop Loss**:
   - `enabled`: Set to `true` to activate the plugin.

2. **stopLossPercent**:
   - `stopLossPercent`: The maximum loss you are willing to accept.

**Example:**
```js
config.stopLoss={enabled:true,'stopLossPercent': 5 };
```

---

## Core Functions

### Initialization
- Loads configuration and sets the loss threshold.

### Loss Monitoring
- Continuously calculates running loss from trades.
- Compares running loss to your configured threshold.

### Trading Halt
- Automatically stops further trading when the loss threshold is reached.

### Event Emission
- Emits an event or log entry when the threshold is triggered.

---

## Events
The plugin may emit the following events:
- `stopLossTriggered`: Emitted when the configured loss threshold is reached and trading stops.

---

## Example Use Cases

1. **Risk Management**:
   - Limit daily losses in volatile markets.

2. **Strategy Testing**:
   - Assess how often your strategy would hit loss limits in backtests.
   
---
