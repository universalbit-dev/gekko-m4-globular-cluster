# 🚀 Creating a Strategy for Gekko M4

Strategies are the core of the Gekko M4 engine. They analyze live market candles and generate trading decisions (`advice`). Each strategy operates on a single market and exchange instance.

---

## 📦 Core Architecture

A strategy is a decoupled JavaScript module that consumes an event stream of market candles (OHLCV, weighted price) and pushes operational commands to downstream tracking engines.

### The Strategy Boilerplate (`my_strategy.js`)

```js
'use strict';

const log = require('../core/log.js');

const strategy = {
  // 1. Lifecycle Setup: Called once when execution boots
  init: function() {
    this.requiredHistory = this.settings.warmupPeriod || 14;
    
    // Core parameters are exposed directly under this.settings
    log.debug(`Strategy initialized with period: ${this.settings.customPeriod}`);
  },

  // 2. Continuous Input Pipeline: Triggers sequentially on every new block bar
  update: function(candle) {
    // Used to cache data arrays or track secondary calculations
  },

  // 3. Evaluation Gate: Triggers on every block bar AFTER warmup history is filled
  check: function(candle) {
    log.debug(`Evaluating tick for price: ${candle.close}`);

    // Core execution rule example
    if (this.settings.longConditionMet) {
      this.advice({
        direction: 'long',
        trigger: {
          type: 'trailingStop',
          trailPercentage: 5
        }
      });
    } else if (this.settings.shortConditionMet) {
      this.advice({ direction: 'short' });
    }
  },

  // 4. Debug Interface: Optional diagnostic loop hook
  log: function() {
    // Custom PM2/Winston console formatters
  },

  // 5. System Teardown: Triggers cleanly upon backtest completion sequences
  end: function() {
    log.info('Backtest cycle terminated. Dumping historical balance allocations.');
  }
};

module.exports = strategy;

```
> 🔗 **Source File:** View the latest updates directly in the repository at [`strategies/INVERTER.js`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/INVERTER.js).

---

## 🔄 Lifecycle Execution Sequence

The Gekko runtime calls the strategy functions in a strict sequential loop matching the data-feed frequency.

```text
       [ SYSTEM BOOT ]
              │
              ▼
        ┌───────────┐
        │  init()   │  ◄── Triggers exactly once at launch
        └───────────┘
              │
              ▼
   ┌──► [ NEW CANDLE RECEIVED ]
   │          │
   │          ▼
   │    ┌───────────┐
   │    │ update()  │  ◄── Computes rolling state arrays
   │    └───────────┘
   │          │
   │          ▼
   │   Is Warmup History Size Met?
   │       ├── NO  ──► Skip execution, fetch next candle loop
   │       └── YES ──► Continue
   │          │
   │          ▼
   │    ┌───────────┐
   │    │  log()    │  ◄── Diagnostic outputs (if debugging is enabled)
   │    └───────────┘
   │          │
   │          ▼
   │    ┌───────────┐
   │    │  check()  │  ◄── Evaluates conditions & issues .advice()
   │    └───────────┘
   │          │
   └──────────┴─────── Loop repeats for duration of session
              │
       [ STREAM END ] (Backtests Only)
              │
              ▼
        ┌───────────┐
        │   end()   │  ◄── Finalizes logs and dumps summary stats
        └───────────┘

```

---

## 🕒 Live Market Input Schema (`candle`)

The `update(candle)` and `check(candle)` gates receive a structured historical metric data block representing the latest compiled execution interval:

```text
{
  "start": Object,      // Moment.js date token. Always use for timestamps (do not use system time)
  "open": 84.35,        // Opening price of the asset within the candle boundary
  "high": 85.95,        // Highest execution target recorded during the interval
  "low": 82.10,         // Lowest execution target recorded during the interval
  "close": 84.12,       // Final closing price before the next sequence block
  "volume": 1254.81,    // Cumulative asset transactional volume
  "trades": 412         // Discrete transaction execution counter count
}

```

---

## ⚡ Deployment & Configuration Specifications

To activate your strategy inside your environment manager (`ecosystem.config.js` or configuration parameters), map the system attributes to your exact file layout.

### Configuration Properties Blueprint (`config.js`)

```js
// 1. Advisor Pipeline Setup
config.tradingAdvisor = {
  enabled: true,
  method: 'my_strategy',    // Must match your exact filename: my_strategy.js
  candleSize: 60,           // Length of each candle block in minutes
  historySize: 14           // Warmup history length matching your strategy needs
};

// 2. Custom Strategy Variable Injection Matrix
// The configuration object name MUST explicitly match the strategy 'method' string above
config.my_strategy = {
  warmupPeriod: 14,
  customPeriod: 10,
  longConditionMet: true,
  shortConditionMet: false
};

```

---

## 🧰 Strategy Tools & Logging Utilities

### 1. Environmental Balance Configuration Access

Any variables specified inside your custom configuration object are instantly injected into the runtime space and can be referenced anywhere within your strategy via `this.settings`:

```js
var evaluationLength = this.settings.customPeriod;

```

### 2. External Utility Ingestion

Strategies are vanilla Node.js execution files; standard dependency hooks can be declared safely at the top of your scripts to pull common array-manipulation utilities:

```js
const _ = require('lodash');
const async = require('async');

```

### 3. Production Logging System

For high-performance, standardized production logs that integrate with background runners like PM2, require the core logging wrapper. Alternatively, you can use the built-in Winston logging architecture located at `strategies/logger.js`.

```js
const log = require('../core/log.js');

// Available severity execution outputs
log.debug('Analyzing marginal cross bounds...');
log.info('System connection verification active.');
log.warn('Liquidity thresholds dipping below safety limits.');
log.error('API execution exception caught cleanly.');

```
