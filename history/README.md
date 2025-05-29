# 📈 Candlestick History & SQLite Integration

## 🔍 Resources
- 📚 [Understanding Basic Candlestick Charts](https://www.investopedia.com/trading/candlestick-charting-what-is-it/)
- 🗄️ [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## 💾 What are `.db` Files Used For?

The `.db` file extension indicates a **database file**. In this project, `.db` files use **SQLite** — a lightweight, file-based database — to store historical market data. This is crucial for **backtesting** and **strategy analysis**.

> **Tip:** You can explore and query these files with tools like [DB Browser for SQLite](https://sqlitebrowser.org/).

---

## 🧩 How Database Files Are Used in This Repository

| 📁 File          | 🔧 Role                                  | 📝 Description                                                      |
|------------------|------------------------------------------|---------------------------------------------------------------------|
| `handle.js`      | 🏗️ Database Initialization               | Sets up and configures the SQLite database                          |
| `scanner.js`     | 🔍 Database Scanning                     | Finds all `.db` files and lists available historical market tables   |
| `writer.js`      | ✍️ Writing Data                          | Inserts candlestick (OHLCV) data into the database                  |
| `reader.js`      | 📖 Reading Data                          | Reads and retrieves candle data for backtesting and analysis        |

---

## ⚙️ Overview of the Data Flow

1. **Database Initialization (`handle.js`)**  
   - Sets up the SQLite connection using `sqlite3`.
   - Names databases based on exchange and version (e.g., `exchange_version.db`).
   - Configures performance settings.

2. **Database Scanning (`scanner.js`)**  
   - Scans the history directory for all `.db` files.
   - Identifies tables and available markets.

3. **Writing Data (`writer.js`)**  
   - Writes candlestick data (OHLCV) with SQL `INSERT` operations.
   - Stores each candle’s start, open, high, low, close, and volume.

4. **Reading Data (`reader.js`)**  
   - Retrieves candles for analysis or backtesting.
   - Offers methods for getting the latest data window, table existence checks, and counting records.

---

## 🧩 Want More Details?  
👉 The plugin section has been updated!  
See the full documentation for the SQLite plugin here:  
[📖 plugins/sqlite/sqlite.md](../plugins/sqlite/sqlite.md)

---

## 🏁 Summary

- `.db` files = SQLite databases with historical market data.
- Used for efficient storage, backtesting, and analysis in Gekko M4.
- Explore, edit, or query `.db` files with free tools like DB Browser for SQLite.

---
