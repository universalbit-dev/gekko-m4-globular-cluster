# Extending Visualization and Advanced Charting in Gekko-M4-Globular-Cluster

## Background: UI Mode and Console Operations

Gekko UI interface has been cancelled. All operations are performed via the terminal, offering a lightweight, resource-efficient, and highly controllable environment. Users interact with the system strictly through command-line operations, [manually editing configuration files](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/env/simulator) and reviewing [logs](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/logs/json)/output in the terminal.

**Key points from UI documentation:**
- **No Graphical Interface:** All interaction is through the command line.
- **Greater Control:** Advanced users benefit from direct log access and granular debugging.
- **Lightweight & Efficient:** Minimal resource use compared to a full UI.

---

## Enabling Advanced Visualization: Grafana Integration

> See: [docs/ngc6121_advanced_charting.md](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/ngc6121_advanced_charting.md)

Although the built-in UI has been removed, the project empowers users to build highly customized dashboards using Grafana. This integration allows anyone—from new users to advanced developers—to create real-time, interactive visualizations and extend system functionality visually.

### Why Use Grafana?

- **Real-Time Monitoring:** View live trading data and simulations.
- **Advanced Visualization:** Chart profit/loss, trade volume, market indicators, and more using time-series graphs, heatmaps, gauges, etc.
- **Custom Dashboards:** Tailor dashboards to your strategies, simulators, and personal requirements.
- **Multi-Source Data:** Integrate with PM2 logs, the Infinity Datasource plugin, and more.
- **Alerting and Anomaly Detection:** Set up notifications for critical events or thresholds.

### Getting Started: Installation and Secure Access

- Follow the step-by-step install guide for Grafana on Ubuntu, including secure HTTPS setup ([see SSL directory](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/ssl)).
- On first login, set a new admin password to ensure security.

### Integrating Your Data: PM2 and Grafana

- Use PM2’s HTTP API to serve logs/metrics as JSON, which can be consumed directly by Grafana.
- Recommended: Use the actively maintained [Grafana Infinity Datasource](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/) for flexible data querying (JSON, CSV, GraphQL, etc.).

#### Example Setup Flow

1. **Start logging with PM2:**
   ```bash
   pm2 start simulator.config.js --merge-logs --log-date-format "YYYY-MM-DD HH:mm:ss"
   ```
2. **Pipe logs for real-time processing:**
   ```bash
   pm2 logs --json | node realTimeProcessor.js >> simulator.json
   ```
3. **Serve logs via HTTP:**
   ```bash
   pm2 serve . 9559 simulator.json
   ```
   - Access logs at: `http://localhost:9559/simulator.json`
### Clarification: Using `pm2 serve` for Log File Access

The `pm2 serve` command is a generic static file server used to expose log files over HTTP. This is essential for integrating with Grafana or other monitoring tools.

**How it works:**  
- You specify a directory and a port; `pm2 serve` will make files in that directory accessible via HTTP.
- For example, to serve the processed log file for all Gekko-M4 activity:
  ```bash
  pm2 serve . 9559 simulator.json
  ```
  This exposes `simulator.json` at [http://localhost:9559/simulator.json](http://localhost:9559/simulator.json).

- If you want to serve only logs for a specific strategy (for example, a file inside `logs/json/strategy.json`):
  ```bash
  pm2 serve ./logs/json 9559 strategy.json
  ```
  Now, [http://localhost:9559/strategy.json](http://localhost:9559/strategy.json) will expose only that strategy’s log file.

- If you run `pm2 serve ./logs/json 9559`, all files within `logs/json/` will be available via HTTP endpoints.

**Summary Table:**

| What you serve                             | Command example                                                    | Exposed HTTP endpoint(s)                        |
|--------------------------------------------|--------------------------------------------------------------------|-------------------------------------------------|
| All Gekko-M4 activity (simulator output)   | pm2 serve . 9559 simulator.json                                    | /simulator.json                                 |
| Only a specific strategy’s logs            | pm2 serve ./logs/json 9559 strategy.json                           | /strategy.json                                  |
| All logs in a directory                    | pm2 serve ./logs/json 9559                                         | /[all files in logs/json/]                      |

**Security Note:**  
When using `pm2 serve`, be aware that anyone with network access can view the exposed files. For remote access, always use HTTPS and restrict access as described in the [SSL setup guide](../../ssl).

4. **Add Infinity Datasource in Grafana:**
   - Point the URL field to your PM2 log endpoint.
   - Test and configure as needed.

5. **Create Custom Panels:**
   - Use Infinity Datasource as the data source for dashboards.
   - Utilize transformations, thresholds, annotations, and dynamic variables for advanced charting.

### For Developers: Consistent Logging for Visual Analytics

- Use the provided `logger.js` module in any strategy to emit standardized JSON logs (timestamp, price, indicators, advice, etc.).
- This enables seamless chart ingestion and comparison across strategies.
- Example logging usage:
   ```js
   const { logger, appendToJsonFile } = require('./logger')('mystrategy');
   // ...
   logger.info(output);
   appendToJsonFile(output);
   ```
**Consistent Logging Example**

To help maintain consistency and clarity in logging for visual analytics, you can refer to a fully implemented and working example using the Winston logger in the RSIBULLBEARADX strategy. This example demonstrates best practices for structured and effective logging, making it easier to track, debug, and visualize important events within your strategies.

See: [RSIBULLBEARADX.js strategy implementation](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/RSIBULLBEARADX.js) for a reference on how to set up and use the logging system.
---

## Advanced Charting Features

- **Annotations:** Mark significant events directly on charts.
- **Thresholds:** Visualize value boundaries (e.g., RSI overbought/oversold).
- **Data Transformations:** Compute moving averages, differences, etc. on the fly.
- **Dynamic Variables:** Dropdowns and interactive filters for simulators, time ranges, and more.

---

## Summary: From Terminal to Dashboard

- Start in console mode for complete control and efficiency.
- Extend and visualize your trading logic using Grafana—no built-in UI required!
- Integrate logs and metrics quickly with PM2 and Infinity Datasource.
- Enjoy real-time, actionable, and highly customizable insights for all your trading simulations and strategies.

---

**For more details, see:**
- [docs/ngc6121_advanced_charting.md](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/ngc6121_advanced_charting.md)
- [SSL setup for secure Grafana](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/ssl)

---
