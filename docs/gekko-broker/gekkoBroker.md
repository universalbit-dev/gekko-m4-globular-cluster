# GekkoBroker.js

## Overview

The `GekkoBroker` module is responsible for managing all communication with the exchange. It delegates specific tasks to helper modules:
- **Portfolio Management**: Handled by the `PortfolioManager` module.
- **Trade Execution**: Managed by the `Orders` module.

This broker is designed to work with private and public exchange configurations, providing capabilities for monitoring and trading.

---

## Key Features

### Initialization
The `Broker` class initializes with the following:
- **Configuration Parameters**: Exchange settings, currency/asset pairs, custom intervals, and private/public API keys.
- **Capabilities**: Features supported by the exchange, such as market pairs and intervals.
- **Modules**: Portfolio manager, API handlers, and utility functions.

### Ticker Management
The broker regularly fetches the latest market ticker data:
- Uses `setTicker()` to retrieve and store ticker information.
- Implements retry logic for network-related errors during API calls.

### Order Management
The broker supports creating and managing orders:
- **Order Creation**: Allows `buy` and `sell` operations using the `createOrder` method.
- **Order Validation**: Ensures orders meet the exchange's requirements.
- **Order Tracking**: Keeps lists of open and closed orders.

### Portfolio Syncing
The broker synchronizes private data when authenticated:
- Updates portfolio balances.
- Retrieves trading fees.
- Ensures all data is up-to-date before executing trades.

### Custom Triggers
Users can define custom triggers for specific market events using the `createTrigger` method.

---

## Class: `Broker`

### Constructor
#### Parameters:
- `config`: Configuration object with exchange and API details.

#### Key Operations:
- Validates configuration for private or public modes.
- Loads the appropriate exchange API wrapper.
- Initializes portfolio and capabilities.

### Methods

#### `cantTrade()`
Checks if the broker is allowed to trade with the given configuration.

#### `cantMonitor()`
Checks if the broker can monitor the exchange without trading access.

#### `sync(callback)`
Synchronizes market data. If private, syncs portfolio and ticker data.

#### `setTicker(retries = 3)`
Fetches the market ticker with retry logic for common network errors.

#### `isValidOrder(amount, price)`
Validates an order against exchange constraints.

#### `createOrder(type, side, amount, parameters)`
Creates a new order of the specified type (`buy` or `sell`).

#### `createTrigger({type, onTrigger, props})`
Defines a custom trigger that executes when specific conditions are met.

---

## Dependencies
The module uses several libraries and custom utilities:
- `dotenv`, `underscore`, `async`, `moment`
- Custom modules: `exchangeChecker`, `exchangeErrors`, `portfolioManager`, `orders`, `trigger`, `exchangeUtils`, `socketConnection`

---

## License

This project is licensed under the MIT License. See the source file for details.
