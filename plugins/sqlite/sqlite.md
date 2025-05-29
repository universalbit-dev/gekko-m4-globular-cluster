# 🗄️ SQLite Plugin Documentation

This plugin provides SQLite database integration for Gekko M4, enabling efficient storage and retrieval of trading data.  
Below you'll find an overview of each file and how they work together.

---
> **Note: Understanding SQLite vs. sqlite3**
>
> - **SQLite** is a lightweight, serverless database engine that stores data in a single local file(history/exchangesimulator_5.1.1.db). It handles all the actual database operations and understands SQL queries.
> - **sqlite3** is a programming library or module (commonly used in languages like JavaScript/Node.js and Python) that lets your code interact with an SQLite database. Through sqlite3, your application can send SQL queries to SQLite, receive results, and manage data.
>
> **In summary:**  
> - SQLite is the database engine.  
> - sqlite3 is the bridge that lets your code use SQLite.
>
> Example in JavaScript (Node.js):
> ```js
> const sqlite3 = require('sqlite3').verbose();
> const db = new sqlite3.Database('mydb.sqlite');
> db.all("SELECT * FROM users", [], (err, rows) => {
>   if (err) throw err;
>   console.log(rows);
> });
> ```
> In this example, `sqlite3` is the Node.js module enabling your code to communicate with the SQLite database file.

## 📁 File Overview

| File Name     | Purpose                                  | Main Functions                |
|---------------|------------------------------------------|-------------------------------|
| `handle.js`   | Database connection & initialization     | DB setup, environment checks  |
| `reader.js`   | Read data from SQLite database           | Query, count, get boundaries  |
| `scanner.js`  | Scan all SQLite DBs in data directory    | List available market tables  |
| `util.js`     | Utilities for table names/settings       | Table naming, config helpers  |
| `writer.js`   | Write candle data into SQLite database   | Table creation, batch insert  |

---

## 🧩 Detailed File Descriptions

### 1. `handle.js` – 🏗️ Database Initialization

- **Purpose:** Ensures the SQLite plugin can load, verifies dependencies, and initializes the database file and directory based on config.
- **Key Functionality:**
  - Checks if dependencies are installed.
  - Creates DB directory/file if needed.
  - Provides `initDB()` to open and configure the database connection (journal/sync modes, busyTimeout).
- **Usage:** Used by other plugin components to obtain a ready-to-use database connection.

---

### 2. `reader.js` – 📖 Data Reading

- **Purpose:** Provides methods to read trading candle data from the SQLite database.
- **Key Methods:**
  - `mostRecentWindow(from, to, next)` – Get the most recent complete window of candles.
  - `tableExists(name, next)` – Check if a table exists.
  - `get(from, to, what, next)` – Retrieve candles in a time range.
  - `count(from, to, next)` – Count candles in a time range.
  - `countTotal(next)` – Count all candles.
  - `getBoundry(next)` – Get the first and last candle timestamps.
  - `close()` – Close the database connection.
- **Usage:** Used by Gekko for backtesting and strategy evaluation.

---

### 3. `scanner.js` – 🔍 Database Scanner

- **Purpose:** Scans the data directory for all `.db` files and detects available markets by reading their table structures.
- **Key Flow:**
  - Scans for `.db` files in the history directory.
  - Reads each DB’s tables to find those containing candle data.
  - Extracts exchange, currency, and asset info from table names.
- **Usage:** Useful for listing which historical data is available for import/backtest.

---

### 4. `util.js` – 🛠️ Utilities

- **Purpose:** Utility helpers for the plugin, especially for table naming and settings.
- **Key Exports:**
  - `settings` – Current plugin settings (exchange, pair, path).
  - `table(name)` – Helper to build table names (e.g., `candles_BTC_USD`).
- **Usage:** Used internally by `reader.js` and `writer.js` for consistent table handling.

---

### 5. `writer.js` – ✍️ Data Writing

- **Purpose:** Handles creation of tables (if needed) and efficient writing (batching) of candle data to SQLite.
- **Key Methods:**
  - `upsertTables()` – Ensures tables exist.
  - `writeCandles()` – Batch insert of candles with transaction support.
  - `processCandle(candle, done)` – Add a candle to the write queue, flushes when buffer fills.
  - `finalize(done)` – Ensures all pending data is saved and closes DB.
- **Usage:** Used during live trading or data import to store new market data.

---

## 📝 Example Usage Flow

1. **Initialization:**  
   `handle.js` sets up the DB connection.
2. **Writing Data:**  
   `writer.js` creates tables and writes new candles.
3. **Reading Data:**  
   `reader.js` fetches and counts candle data for analysis.
4. **Scanning for Data:**  
   `scanner.js` lists what historical data is available.
5. **Utilities:**  
   `util.js` ensures table names and settings are consistent throughout.

---

## ⚡ Quickstart

- Make sure your config enables the SQLite plugin and dependencies (`sqlite3`) are installed.
- The plugin will auto-manage DB creation and table structure.
- Use Gekko’s import/backtest modules to interact with stored candle data.

---

## 📚 Further Reading

- [Gekko Documentation](https://gekko.wizb.it/docs/)
- [sqlite3 Node.js Module](https://www.npmjs.com/package/sqlite3)

---

**Plugin Authors:**  
Originally by Mike van Rossum and contributors.

**License:** MIT

---
