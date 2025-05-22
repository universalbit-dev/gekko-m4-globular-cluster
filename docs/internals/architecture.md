# Gekko M4 Globular Cluster — Architecture
[work in progress]

Welcome to the architecture overview of **Gekko M4 Globular Cluster**. This document highlights the modular, simulator-first design, advanced logging for visualization, and the streamlined plugin system at the heart of Gekko M4.

---

## Core Architectural Principles

- **Simulator-Oriented:** A central simulation engine orchestrates data flow, trading logic, and analytics.
- **Highly Modular:** Each functional area (market simulation, event handling, logging, TA, ML) is encapsulated in a dedicated module.
- **Event-Driven:** Communication leverages Node.js’s EventEmitter, enabling decoupled and reactive system behavior.
- **Pluggable Strategy and Analysis Layers:** Supports both rule-based and ML-driven strategies, with built-in TA libraries.

---

## Core Components

### 1. Simulation Engine
- Orchestrates all workflows: feeds market data, triggers strategies, manages state, outputs results.
- Provides APIs to plug in custom environments, RL agents, and strategy modules.

### 2. Market Data & Candle Batching
- **`core/candleBatcher.js`** aggregates fine-grained data into larger “candles” for analysis and strategy execution.
- Supports both historical simulation and real-time streaming.

### 3. Event System
- **`core/emitter.js`** is the central event bus, using extended EventEmitter with deferred/batched event emission.
- Enables loose coupling and easy extensibility between plugins, strategies, and analytics.

### 4. Plugin and Strategy Loader
- **`core/pluginUtil.js`** discovers and loads plugins/strategies as per configuration and simulation mode.
- Supports async/sync initialization and dependency checks.

### 5. Technical Analysis Libraries
- **`core/talib.js`** and **`core/tulind.js`** integrate standard TA indicators for use in both rule-based and ML-driven strategies.

### 6. Reinforcement Learning & Neural Networks
- **`core/rl.js`** provides matrix operations/utilities for RL agents and deep learning.
- **`core/convnetUtil.js`** offers utilities for ML model metrics and moving-window statistics.

### 7. Visualization
- **`core/vis.js`** provides graphing utilities for simulation results, training metrics, and strategy performance.

### 8. Logging and Utilities
- **`core/log.js`** centralizes logging with environment-aware output.
- **`core/util.js`** provides config management, error handling, and directory resolution.

---

## 9. Standardized JSON Logging & Advanced Charting

**`strategies/logger.js`** is a critical, standardized module that outputs all simulation and trading data in structured JSON format.  
This design enables seamless integration with modern visualization tools, especially **Grafana**.

### Purpose

- **Structured Logging:** All trading, simulation, and analytics events are logged in machine-readable JSON.
- **Observability:** Logs are compatible with aggregators (e.g., Loki, Prometheus) and are visualized in Grafana dashboards.
- **Monitoring:** Enables both deep debugging and high-level monitoring for strategies and the platform.

### Integration Flow

1. **Enable `logger.js`** in your strategy configuration.
2. JSON logs are produced, ready for ingestion by log shippers or databases.
3. Grafana (via Loki, Prometheus, etc.) consumes the logs.
4. Visualize trades, metrics, and analytics in real time or historically.

**See the [Advanced Charting Setup Guide](../ngc6121_advanced_charting.md) for step-by-step instructions.**

---

## Plugins: Simplified

Gekko M4 uses a **plugin architecture** for extensibility.  
For this cluster, only Gekko core plugin components are enabled by default. This ensures stability, performance, and a clear upgrade path.

- **Active Plugins:**  
  Only the following core plugin types are enabled:
  - Data adapters (market connectors, candle batchers)
  - Logger (JSON logger for Grafana integration)
  - Strategy runner/executor
  - Technical analysis adapters (TA-Lib, Tulip)
  - Event emitters

- **Why Simplified?**  
  - Reduces attack surface and complexity.
  - Ensures that all logging and analytics flow through standardized, observable interfaces.
  - Simplifies extension and troubleshooting.

- **How to Extend:**  
  - New plugins can be added by developers, but must be registered and enabled in the configuration.
  - All plugins must conform to the event-driven interface for maximum compatibility.

---

## Data Flow & Extensibility

1. **Initialization:** Loads config, sets up markets, plugins, and strategies.
2. **Market Data Ingestion:** Feeds raw/historical data through the candle batcher.
3. **Processing & Event Broadcasting:** Batched candles/events trigger strategy evaluation and plugin logic.
4. **Strategy Execution:** Strategies process data, issue trade signals, and log analytics.
5. **Logging & Visualization:** All actions/results are logged; metrics are visualized in real-time or after simulation.

---

## Simulator-Driven Modes

- **Backtesting:** Run strategies on historical data.
- **Live Simulation:** Paper trading or dry runs using live exchange data.
- **Reinforcement Learning:** Train AI agents in a controlled, repeatable environment.

---

**Gekko M4 Globular Cluster** — Modular, simulation-first quantitative research.  

---
