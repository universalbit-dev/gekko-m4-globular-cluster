<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

[PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Import Exchange Data:
```bash
cd ~/gekko-m4-globular-cluster
pm2 start import.config.js
```

```bash
2024-03-26 13:00:20 (DEBUG):	Processing 980 new trades. From 2022-02-18 08:01:04 UTC to 2022-02-19 23:06:29 UTC. (2 days)
2024-03-26 13:00:22 (DEBUG):	Processing 999 new trades. From 2022-02-19 23:43:31 UTC to 2022-02-21 23:47:17 UTC. (2 days)
2024-03-26 13:00:24 (DEBUG):	Processing 999 new trades. From 2022-02-21 23:48:02 UTC to 2022-02-24 02:40:50 UTC. (2 days)
2024-03-26 13:00:26 (DEBUG):	Processing 999 new trades. From 2022-02-24 02:41:01 UTC to 2022-02-24 20:15:16 UTC. (18 hours)
2024-03-26 13:00:28 (DEBUG):	Processing 999 new trades. From 2022-02-24 20:17:49 UTC to 2022-02-26 19:10:42 UTC. (2 days)
2024-03-26 13:00:30 (DEBUG):	Processing 999 new trades. From 2022-02-26 19:15:23 UTC to 2022-02-28 17:06:37 UTC. (2 days)
2024-03-26 13:00:32 (DEBUG):	Processing 722 new trades. From 2022-02-28 17:06:45 UTC to 2022-02-28 23:58:28 UTC. (7 hours)
2024-03-26 13:00:32 (INFO):	Done importing!
```
* data import completed


---
Plugins to Enable/Disable:[import.js](https://github.com/universalbit-dev/gekko-m4/blob/master/ecosystem/import/import.js)
* import mode

| Plugin         | description     | enable  |
|--------------|-----------|------------|
| BackTest | Testing your strategy      | disabled        |
| CandleWriter | Store Candle in a database      | enabled        |
| PaperTrader      | Simulate Fake Trades  | disabled       |
| Importer | Import Exchange Data      | enabled        |
| TradingAdvisor | Advice Buy-Sell Orders      | disabled        |




