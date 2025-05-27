# 📄 How to Filter Logs to `generic.json` with realTimeProcessor.js

This guide helps you process your log data, filter out unwanted lines, and generate a clean, size-limited `generic.json` log file.

---

## 1️⃣ **Prepare Your Environment**  
- Make sure you have **Node.js** installed (`node -v` to check).
- Place `realTimeProcessor.js` in your project directory.

---

## 2️⃣ **Run the Log Processor**

```sh
pm2 logs --json | node realTimeProcessor.js
```
- 🏃 This streams live logs from your PM2 processes directly into the script for real-time filtering.

---

## 3️⃣ **How Filtering Works**  
The script will **automatically exclude lines** containing:
- `[INFO]` ℹ️  
- `[DEBUG]` 🐞  
- `[WARNING]` ⚠️  
- `[EXCHANGE SIMULATOR]` 🧪  
- `[ERROR]` ❌  
- `Wohoo!`, `(DEBUG)`, `"Emitted candles event"`, or a line of dashes

Only **valid JSON log lines** that do **not** contain these keywords are saved.

---

## 4️⃣ **Where to Find Your Filtered Logs**

- The filtered logs are saved in:  
  **`generic.json`** 📦

- **Log Size Limit:**  
  The file is capped at **1MB**.  
  Oldest entries are removed automatically to keep within this size.

---

## 5️⃣ **If Something Goes Wrong**

- If `generic.json` contains invalid JSON, it is reset to an **empty array**.
- The script only writes valid JSON entries.

---

## 6️⃣ **Stop the Script Gracefully**

- Press `Ctrl+C` ⌨️ to stop.
- The script will flush the last buffered log entries before exiting.

---

## 7️⃣ **Summary Table**

| Action                      | What Happens                                               |
|-----------------------------|-----------------------------------------------------------|
| Start Script                | Filters stdin, writes valid logs to `generic.json`        |
| Unwanted Log Lines          | Are skipped (not saved)                                   |
| Exceeds 1MB                 | Oldest logs removed to fit size                           |
| Invalid `generic.json`      | Resets to empty array                                     |
| Stop Script (Ctrl+C/SIGTERM)| Writes any buffered logs before exiting                   |

---

## 8️⃣ **Example File Location**

```text
project-root/
├── realTimeProcessor.js
├── generic.json   ← Your filtered logs here!
```

---

**Now you have a clean, filtered, easy-to-manage log file!** 🎉
