# Stop Loss Plugin Documentation

> ⚙️ **Configuration Quick Start**
>
> To enable and configure the Stop Loss plugin, add the following to your strategy config (for example, in `env/simulator/trade_rsibullbearadx_simulator.js`):
>
> ```js
> config.stopLoss = {
>   enabled: true,
>   stopLossPercent: 5 // Trading will stop if your portfolio drops by 5%
> };
> ```
>
> 🧩 **Plugin Integration:**  
> The plugin is registered in `plugins.js` at the project root:
>
> ```js
> {
>   name: 'Stop Loss',
>   description: 'Stops trading when a defined loss is reached',
>   slug: 'stopLoss',
>   modes: ['realtime', 'backtest'],
>   path: config => 'stopLoss/stopLoss.js',
> }
> ```
>
> ✅ This setup ensures the Stop Loss feature is active and visible in both real-time and backtest modes, helping safeguard your portfolio automatically.
>
> 💡 *Tip: Adjust `stopLossPercent` to set your personal risk tolerance!*

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
