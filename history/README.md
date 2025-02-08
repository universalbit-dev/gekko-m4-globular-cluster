CandleStick
* [Understanding Basic Candlestick Charts](https://www.investopedia.com/trading/candlestick-charting-what-is-it/)
* [DB Browser for SQLite](https://sqlitebrowser.org/)

---

The ".db" file extension typically indicates a database file. In the context of the `universalbit-dev/gekko-m4-globular-cluster` repository, the ".db" files are used with SQLite, a lightweight, disk-based database.

Here's an explanation based on the code references:

1. **Database Initialization (handle.js)**:
   - The database is initialized using `sqlite3`.
   - The database name is formed using the exchange and version, e.g., `exchange_version.db`.
   - The database is configured with specific PRAGMA settings for performance.

2. **Database Scanning (scanner.js)**:
   - The script scans the database directory for `.db` files.
   - It reads the database to identify tables and markets.

3. **Writing to Database (writer.js)**:
   - Candlestick data (OHLCV) is written to the database using SQL INSERT statements.
   - The data is stored in tables with candle information like start time, open, high, low, close, volume, etc.

4. **Reading from Database (reader.js)**:
   - The script reads candlestick data from the database.
   - It provides methods to get the most recent window, table existence, data count, and database boundaries.

In summary, the `.db` files store historical market data in SQLite format, which is used for backtesting and analysis.
