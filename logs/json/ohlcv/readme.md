# 🗂️ OHLCV JSON Deduplication Guide

## 📄 Overview

This module helps you **remove duplicate entries** from OHLCV JSON files, keeping only the earliest entry for each timestamp. This is especially useful when market data fetches create duplicate records due to polling APIs.

---

## ⚙️ Components

### 1. `deduplicate_json.config.js`  
**Configures deduplication jobs for your JSON files.**

- **Job 1:**  
  - 🏷️ **Name:** `ohlcv ccxt JSON data deduplicate`  
  - 📜 **Script:** `deduplicate_ohlcv_json.js`  
  - 📂 **Input/Output:** `ohlcv_ccxt_data.json` → deduplicated

- **Job 2:**  
  - 🏷️ **Name:** `ohlcv JSON data deduplicate`  
  - 📜 **Script:** `deduplicate_ohlcv_json.js`  
  - 📂 **Input/Output:** `ohlcv_data.json` → deduplicated

> Both jobs use **cluster mode** and run a single instance for reliability and scalability.

---

### 2. `deduplicate_ohlcv_json.js`  
**Performs the deduplication logic.**

#### 🚀 Features
- Reads a JSON file containing an **array of OHLCV objects** (must include timestamp, open, high, low, close, and volume).
- Removes duplicate entries by timestamp (keeps the first occurrence).
- Outputs a **deduplicated JSON array** with only these fields:  
  `timestamp`, `open`, `high`, `low`, `close`  
  _(the volume field is removed for standardization)_
- Output filename is the original name with `_deduped.json` appended before the extension (if not specified).
- Can be **run as a script** or **used as a module** in other Node.js code.

---

## 🛠️ Usage

### 🎛️ As a CLI Tool

```bash
node deduplicate_ohlcv_json.js <input.json> <output.json>
```
- Example:  
  ```bash
  node deduplicate_ohlcv_json.js ohlcv_data.json ohlcv_data_deduped.json
  ```
- If you omit `<output.json>`, the script will automatically write to `<input>_deduped.json`.

### 🧩 As a Module

```js
const dedupOhlcvJSON = require('./deduplicate_ohlcv_json.js');
dedupOhlcvJSON('ohlcv_data.json', 'ohlcv_data_deduped.json');
```

- Overwriting the source file is supported:  
  ```js
  dedupOhlcvJSON('ohlcv_data.json', 'ohlcv_data.json');
  ```

---

## ⏰ Automatic Hourly Restart with PM2

To keep your deduplication jobs running smoothly, you can schedule an automatic restart every hour using PM2. This helps free up resources and ensures consistent performance.

### 🚀 How To Set Up Hourly Restart

```bash
pm2 start deduplicate_json.config.js --cron-restart="0 * * * *"
```

- This command tells PM2 to **restart all deduplication jobs every hour** (at minute 0).
- 📌 Make sure you have [PM2](https://pm2.keymetrics.io/) installed globally.

---

## 💡 Notes

- 📌 The input JSON file must be an **array of objects** with at least `timestamp`, `open`, `high`, `low`, `close`, and `volume` fields.
- 🏷️ Only the first five fields are kept; the `volume` field is removed in the output for consistency.
- 🔄 Running with the same input and output filename will **overwrite** your original file.

---

## 👤 Author

- **universalbit-dev**
- 📅 Last updated: June 2025

---

## 🧭 File Locations

- **Config:** [`logs/json/ohlcv/deduplicate_json.config.js`](./deduplicate_json.config.js)
- **Script:** [`logs/json/ohlcv/deduplicate_ohlcv_json.js`](./deduplicate_ohlcv_json.js)

---

Enjoy fast, reliable deduplication for your OHLCV JSON data! 🚀📊

---
