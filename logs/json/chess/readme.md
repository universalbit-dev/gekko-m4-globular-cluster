# ♟️ Chess Log Processing & Upload Guide

Welcome! This guide helps you capture, process, and upload chess game logs for the [`gekko-m4-globular-cluster`](https://github.com/universalbit-dev/gekko-m4-globular-cluster) project.

---

## 📂 What’s Inside?

All scripts and data live in: [`logs/json`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/logs/json)

### 📝 Key Files

| File                        | Description                                                                                             |
|-----------------------------|---------------------------------------------------------------------------------------------------------|
| `randomchess.json`          | 📄 Rolling JSON log of filtered chess games ("Random Game Of Chess"), capped at 1MB.                   |
| `realTimeChessProcessor.js` | ⚡ Node.js script that filters logs, updates `randomchess.json` live.                                   |
| `jsonbin_randomchess.js`    | ☁️ Node.js uploader: pushes `randomchess.json` to [jsonbin.io](https://jsonbin.io/) every hour.        |
| `jsonbin_chess_uploader.sh`    | |
--- 
>  **Make the script executable (only needed once):**
>    ```bash
>    chmod +x jsonbin_chess_uploader.sh
>    ```
>
>  **Start the uploader and log processor:**
>    ```bash
>    ./jsonbin_chess_uploader.sh
>    ```
>
> ---
>
> 🚦 **What Happens When You Run the Script?**
>
> - **Uploads Chess Data:**  
>   🚀 Starts `jsonbin_randomchess.js` using PM2, so your chess data is sent to [jsonbin.io](https://jsonbin.io).
> - **Processes Logs in Real Time:**  
>   📡 Launches `realTimeChessProcessor.js`, which listens for and processes live PM2 logs.
>
> ---
>
> 📢 **Tip:**  
> Make sure you have set your `X-Access-Key` for jsonbin.io in the uploader script, or it won’t work!
>
> ---


## 🧠 Log Origins

> 🟦 **Note:**  
> The chess logs filtered into `randomchess.json` come specifically from the **'neuralnet'** strategies.  
> These strategies generate the "Random Game Of Chess" events you’ll see captured and uploaded.
>
> This helps ensure the data is both consistent and relevant for backtesting, analysis, and sharing!

---

## 🗂️ How It Works

1. **🎯 Capture & Filter Logs**
   - Run your service/app with PM2.
   - Pipe logs to the processor:
     ```bash
     pm2 logs --json | node realTimeChessProcessor.js
     ```
   - Only logs containing "Random Game Of Chess" from the relevant strategies are saved to `randomchess.json`.
   - The file auto-trims to stay under 1MB.

2. **☁️ Automated Cloud Upload**
   - In another terminal/process, run:
     ```bash
     node jsonbin_randomchess.js
     ```
   - This script uploads the latest chess log to your [jsonbin.io](https://jsonbin.io/) account every hour.

---

## 🌐 About [jsonbin.io](https://jsonbin.io/)

- 🔒 Secure, simple JSON storage in the cloud.
- 📤 Great for sharing logs, syncing data, and backups.
- 📚 Perfect for downstream analysis and collaboration.

---

## 💡 Example Use Cases

- 📈 **Strategy Analysis:** Keep reproducible logs for chess/backtesting experiments.
- 🤝 **Cloud Sync:** Share latest chess results with teammates or tools.
- 🗃️ **Archiving:** Maintain a compact, rolling archive for research or audits.

---

## ⚠️ Requirements

### 🔑 You Need a [jsonbin.io](https://jsonbin.io) API Key!

1. **Register/Login** at [jsonbin.io](https://jsonbin.io).
2. **Get your X-Access-Key** (API key).
3. **Add it** to your uploader script:
   ```js
   const accessKey = ''; // <== Paste your jsonbin.io X-Access-Key here
   ```
4. **Note:** No upload will work without this key!

---

## 👤 Author

- **universalbit-dev**

---
