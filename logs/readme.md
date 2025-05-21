# 📈 Logging, Rotation, and Grafana Visualization in Gekko-M4

## 1. Standardized Logging with Winston

This project uses a custom logger (`strategies/logger.js`) based on [Winston](https://github.com/winstonjs/winston), delivering consistent, structured, and easily analyzable logs for all trading strategies.

### Key Features

- **Consistent Field Order:** OHLCV fields (`timestamp`, `open`, `high`, `low`, `close`, `volume`) always appear first in every log entry for clarity and uniformity.
- **JSON Output:** All logs are output as JSON objects, making them easy to parse, search, and analyze.
- **Size-Based Log Rotation:** Uses [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file) to rotate log files when they reach 10MB, keeping only the most recent 5 files.
- **Separate Analytics Files:** Each strategy writes its analytics to a dedicated `.json` file in the `logs/json/` directory for further analysis and visualization.

### Example Usage

```js
const { logger, appendToJsonFile } = require('./logger')("myStrategy");

logger.info({ timestamp: ..., open: ..., high: ..., ... });
appendToJsonFile({ ... }); // Also logs to JSON for analytics and Grafana
```

### Log Rotation Explained

- **Trigger:** When a log file exceeds 10MB, it is automatically rotated.
- **Retention:** Only the last 5 logs are kept. Older logs are deleted (or can be zipped if you set `zippedArchive: true`).
- **Customization:**
  - For daily rotation, add a `datePattern`:
    ```js
    new DailyRotateFile({
      filename: logFile,
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '5',
      zippedArchive: true
    })
    ```

---

## 2. Serving Logs for Grafana with PM2

Expose your JSON log files over HTTP using PM2's serve mode:

```json
{
  "name": "grafana_rsibullbearadx",
  "script": "serve",
  "env": {
    "PM2_SERVE_PATH": "./logs/json",
    "PM2_SERVE_PORT": 9563,
    "PM2_SERVE_SPA": true,
    "PM2_SERVE_HOMEPAGE": "./logs/json/rsibullbearadx.json"
  }
}
```

- **PM2_SERVE_PATH:** Directory to serve (e.g., `./logs/json`).
- **PM2_SERVE_PORT:** Port to serve on (e.g., `9563`).
- **PM2_SERVE_HOMEPAGE:** The default file at the root endpoint (e.g., `rsibullbearadx.json`).

---

## 3. Advanced Charting in Grafana Using Infinity Data Source

The [Infinity data source](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/) is a robust and community-maintained plugin that allows you to connect Grafana directly to your JSON log files.

### Why Infinity?

- Supports JSON, CSV, XML, GraphQL, and more.
- Actively developed and maintained.
- Flexible for complex queries and large datasets.

### Step-by-Step: Visualizing `rsibullbearadx.json`

#### 1. Install the Infinity Plugin

- In Grafana, go to **Configuration > Plugins**.
- Search for `Infinity` and install the “Infinity” data source by Yesoreyeram.
- Restart Grafana if required.

#### 2. Add the Infinity Data Source

- Go to **Configuration > Data sources**.
- Click **Add data source**.
- Select **Infinity**.
- Name it something like `Strategy JSON`.

#### 3. Configure Infinity for Your Log

- Set the **Type** to `JSON`.
- For **URL**, enter:
  ```
  http://<your-server-ip>:9563/rsibullbearadx.json
  ```
  Replace `<your-server-ip>` with your server's address; if running locally, use `http://localhost:9563/rsibullbearadx.json`.

#### 4. Create a Table Panel

- Go to your Grafana dashboard, click **Add panel** > **Add new panel**.
- Choose the **Infinity** data source.
- **Type:** `JSON`
- **URL/Inline:** Enter the endpoint as above.
- **Format As:** `Table`
- **Root Selector:** Leave blank if your JSON is a simple array of objects (as in this setup).

#### 5. View and Analyze Your Full Log

- The table panel will automatically parse the JSON file. Each log entry becomes a row, with fields as columns (e.g., `timestamp`, `open`, `high`, etc.).
- Use Grafana’s column options to sort, filter, and format your data.
- You can add additional panels for:
  - **Time Series/Bar Chart:** Plot price, volume, or signals over time.
  - **Stat Panel:** Show summary values (e.g., last, min, max of a metric).
  - **Heatmap:** Visualize volatility or density of events.

---

## 4. PM2 Log Management Quick Reference

- **View all logs in real time:**
  ```sh
  pm2 logs
  ```
- **Specify log file paths:**
  ```sh
  pm2 logs -l --log [path]
  pm2 logs -o <path>    # stdout logs
  pm2 logs -e <path>    # error logs
  ```
- **Add timestamps:**
  ```sh
  pm2 logs --time
  pm2 logs --log-date-format <format>
  ```
- **Merge logs from multiple instances:**
  ```sh
  pm2 logs --merge-logs
  ```

More: [PM2 Log Management Documentation](https://pm2.keymetrics.io/docs/usage/log-management/)

---

## 5. Summary & References

- **Winston logger.js**: Ensures consistent, analyzable logs for every strategy, with rotation.
- **PM2 Serve**: Exposes your logs for easy access by Grafana and other tools.
- **Grafana Infinity**: Enables full-table and advanced visualizations from your raw or processed strategy logs.
- **Infinity plugin documentation:** [yesoreyeram-infinity-datasource](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/)

**This setup provides a robust, modern, and highly visual monitoring and analytics stack for your trading strategies.**

---

### Useful Links

- [`strategies/logger.js`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/logger.js)
- [`logs/readme.md`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/logs/readme.md)
- [Winston Logger](https://github.com/winstonjs/winston)
- [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Grafana Infinity Plugin](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/)

---
