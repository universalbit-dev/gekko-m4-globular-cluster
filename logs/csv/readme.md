# 🗂️ OHLCV CSV Deduplication Guide

## 📄 Overview

This module helps you **remove duplicate rows** from OHLCV CSV files, keeping only the earliest entry for each timestamp. This is especially useful when working with market data that might contain duplicates due to polling APIs.

---

## ⚙️ Components

### 1. `deduplicate_csv.config.js`  
**Configures deduplication jobs for different CSV files.**

- **Job 1:**  
  - 🏷️ **Name:** `ohlcv CSV data deduplicate`  
  - 📜 **Script:** `deduplicate_ohlcv_csv.js`  
  - 📂 **Input/Output:** `ohlcv_data.csv` → deduplicated

- **Job 2:**  
  - 🏷️ **Name:** `ohlcv ccxt CSV data deduplicate`  
  - 📜 **Script:** `deduplicate_ohlcv_csv.js`  
  - 📂 **Input/Output:** `ohlcv_ccxt_data.csv` → deduplicated

> Both jobs use **cluster mode** and run a single instance.

---

### 2. `deduplicate_ohlcv_csv.js`  
**Performs the actual deduplication.**

#### 🚀 Features
- Reads a CSV file with market OHLCV data (header expected).
- Removes duplicate rows based on the **timestamp** (first column).
- Outputs a **tab-separated** CSV with only the first five columns:  
  `timestamp`, `open`, `high`, `low`, `close`.
- Output filename is the original name with `_deduped.csv` appended before the extension.
- Can be run as a script or used as a module in other Node.js code.

---

## 🛠️ Usage

### 🎛️ As a CLI Tool

```bash
node deduplicate_ohlcv_csv.js <input.csv> <output.csv>
```
- Example:  
  ```bash
  node deduplicate_ohlcv_csv.js ohlcv_data.csv ohlcv_data_deduped.csv
  ```

### 🧩 As a Module

```js
const dedupOhlcvCSV = require('./deduplicate_ohlcv_csv.js');
dedupOhlcvCSV('ohlcv_data.csv', 'ohlcv_data_deduped.csv');
```

- Overwriting the source file is supported:  
  ```js
  dedupOhlcvCSV('ohlcv_data.csv', 'ohlcv_data.csv');
  ```

---

## 💡 Notes

- 📌 The script expects the **first line to be a header**.
- 🏷️ Only the first five columns are kept; the volume column (if present) is removed.
- 📑 Output is **tab-separated** for compatibility with data analysis tools.
- 🔄 Running with the same input and output filename will overwrite the original file.

---

## 👤 Author

- **universalbit-dev**
- 📅 Last updated: June 2025

---

## 🧭 File Locations

- **Config:** [`logs/csv/deduplicate_csv.config.js`](./deduplicate_csv.config.js)
- **Script:** [`logs/csv/deduplicate_ohlcv_csv.js`](./deduplicate_ohlcv_csv.js)
  
---

## ⏰ Automatic Hourly Restart with PM2

To keep your deduplication jobs running smoothly, you can schedule an automatic restart every hour using PM2. This helps free up resources and ensures consistent performance.

### 🚀 How To Set Up Hourly Restart

```bash
pm2 start deduplicate_csv.config.js --cron-restart="0 * * * *"
```

- This command tells PM2 to **restart all deduplication jobs every hour** (at minute 0).
- 📌 Make sure you have [PM2](https://pm2.keymetrics.io/) installed globally.

---

Enjoy clean, deduplicated OHLCV data! 🚀📊

---
