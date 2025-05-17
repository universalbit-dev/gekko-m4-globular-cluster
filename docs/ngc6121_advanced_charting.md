### Gekko-M4-Globular-Cluster [NGC 6121]
#### Log Management **Grafana Advanced Charting**

---
**Why Grafana for Advanced Charting?**
#### Overview
The **Grafana Lab Project** is focused on building advanced, interactive, and real-time visualization dashboards for financial data and simulations. This project leverages Grafana's powerful charting capabilities and multi-source integration to monitor, analyze, and visualize key metrics derived from trading simulations and financial indicators.

#### Key Features
- **Real-Time Monitoring**: 
Live updates for trading simulations and financial data streams.
- **Advanced Charting**: 
Visualize key metrics such as profit/loss, trade volume, and market indicators with line charts, heatmaps, and gauges.
- **Multi-Source Integration**: 
Directly connect to PM2 API.
- **Custom Dashboards**: 
Tailored dashboards for tracking simulators, market trends, and overall system performance.
- **Alerting**: 
Set up thresholds and anomaly detection alerts for financial metrics.

#### Goals
The primary goal of the GrafanaLab Project is to provide actionable insights through intuitive dashboards, enabling better decision-making for financial and trading simulations. This includes:
- Creating dashboards for monitoring simulator performance (e.g., profits, trade counts).
- Visualizing trends in market indicators (e.g., RSI, Bollinger Bands).
- Detecting anomalies in trading simulations and financial metrics.

#### Use Cases
- **Financial Simulations**: Track multiple simulators (e.g., neural networks, Bollinger Bands) and compare their performance.
- **Trading Metrics**: Analyze profit/loss trends, trade frequency, and market conditions.
- **Anomaly Detection**: Identify unexpected behavior or significant performance deviations.
- **Visualization Flexibility**: 
Grafana provides a wide range of chart types, including time-series graphs, heatmaps, gauges, tables, and more.
- **Real-Time Monitoring**: 
Native support for real-time updates, making it ideal for financial data that changes frequently (e.g., trading simulations).
- **Multi-Source Integration**: 
Grafana can connect to multiple data sources simultaneously, such as:
  - PM2 API                         Logs and Metrics
  - Grafana Infinity Datasource     CSV JSON HTML 

- **Alerting**: 
Built-in alerting system that can notify you of specific thresholds or anomalies.
- **Custom Dashboards**: Highly customizable dashboards tailored to your financial and simulator data.

---

#### Installation of GrafanaLab:
**Install Grafana**:
   - Installation on Ubuntu Noble[24.04]
   
```bash
wget -q -O - https://packages.grafana.com/gpg.key | gpg --dearmor | sudo tee /usr/share/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install grafana
```
     
**First Run**
```
sudo /bin/systemctl start grafana-server
```

**First Login**

When you log in to Grafana for the first time with the default credentials (`username: admin`, `password: admin`), Grafana prompts you to create a new password for the `admin` account. This is a security measure to ensure that the default credentials are not left unchanged, which could expose your Grafana instance to unauthorized access.

#### Steps After First Login

**Login with Default Credentials:**
   - Navigate to the Grafana login page (e.g., `http://localhost:3000`).
   - Enter the default credentials:
     - **Username:** `admin`
     - **Password:** `admin`

**Prompt to Change Password:**
   - After logging in, Grafana will immediately prompt you to set a new password for the `admin` account.
   - This step is mandatory, and you cannot proceed without creating a new password.

**Create a New Password:**
   - Enter the new password in the **New Password** field.
   - Confirm the new password by entering it again in the **Confirm Password** field.

**Save the New Password:**
   - Click the **Save** button to update the password.
   - Once saved, you will be redirected to the Grafana dashboard.

#### Why This Step is Important
**Security Enhancement:** 
- Leaving default credentials unchanged can lead to unauthorized access, especially if your Grafana instance is exposed to the internet.
**Mandatory Best Practice:** 
- Grafana enforces this as a best practice to ensure security from the first login.

---

### **PM2 HTTP API for Logs and Metrics**

PM2 provides a simple and effective way to manage logs and metrics through its built-in **HTTP API**. This feature allows you to expose application logs and metrics over HTTP, making it easy to integrate with monitoring tools like Grafana or any custom client using Grafana Infinity Datasource.

By utilizing this setup, you can streamline your logging process and eliminate the need for external log-shipping tools like Filebeat or Logstash.

---

### **Benefits of Using PM2's HTTP API**

**1. Simplified Log Management**:
- No need to install or configure external log shippers like Filebeat or Logstash.
- PM2 directly handles logs and exposes them over HTTP for easy consumption.

**2. Real-Time Access**:
- Logs and metrics are accessible in real time, enabling seamless integration with monitoring and debugging tools.

**3. Grafana Integration**:
- Use Grafana's **Infinity Datasource Plugin** to directly query PM2's logs and metrics endpoint, making visualization straightforward.

**4. Easy to Configure**:
- PM2 simplifies the setup process with built-in support for serving static files over HTTP.

---

### **How to Enable PM2 HTTP API**

#### Step 1: Start All Configured Processes
Ensure that all processes defined in your PM2 configuration are started with merged logs and a readable log date format. Use the following command:
```bash
pm2 start simulator.config.js --merge-logs --log-date-format "YYYY-MM-DD HH:mm:ss"
```

---

#### Step 2: Process and Store Logs in Real Time
To maintain a valid JSON file (`simulator.json`) for logs, use a custom `realTimeProcessor.js` script to:
1. Read the existing content of `simulator.json`.
2. Append new log entries to the existing data.
3. Rewrite the file to ensure it remains valid JSON.

Run the following command to pipe PM2 logs into your log processor:
```bash
pm2 logs --json | node realTimeProcessor.js >> simulator.json
```

---

#### Step 3: Serve Logs via HTTP
PM2 can serve static files using its `pm2 serve` feature. To expose `simulator.json` over HTTP, use the following command:

```bash
pm2 serve . 9561 simulator.json
```

The logs **[simulator.json]** will now be accessible via:
```
http://localhost:9561/simulator.json
```
![Simulator JSON](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/exchangesimulator/simulator_json.png)

---

### **Additional Notes**
- Ensure that the `.pm2` directory has proper permissions to avoid runtime issues:
   ```bash
   sudo chmod -R 755 ~/.pm2
   ```

- If needed, you can rotate logs using the `pm2-logrotate` module:
   ```bash
   cd ~/.pm2/modules
   git clone https://github.com/keymetrics/pm2-logrotate.git
   cd pm2-logrotate
   npm install
   pm2 start app.js
   ```

For more details on serving files with PM2, refer to the [PM2 Serve Documentation](https://pm2.keymetrics.io/docs/usage/expose/).

---

#### **Add Grafana Infinity Datasource as a Data Source**
- Instead of using the JSON API plugin (which is in maintenance mode), you can use the **Grafana Infinity Datasource** plugin, which supports querying data from JSON, CSV, XML, GraphQL, and HTML endpoints.

---

#### **Install and Configure Grafana Infinity Datasource**

**Install the Plugin**:
- To install the Grafana Infinity Datasource plugin, run the following command:
     ```bash
     sudo grafana-cli plugins install yesoreyeram-infinity-datasource
     sudo systemctl restart grafana-server
     ```

**Add Data Source in Grafana**:
   - Open Grafana in your browser (e.g., `http://localhost:3000`).
   - Log in with your credentials.
   - Navigate to **Configuration > Data Sources** and click **Add Data Source**.
   - Search for and select **Infinity Datasource** from the list.

**Configure the Data Source**:
- Fill in the required fields:
- **Name**: Assign a name to your data source (e.g., `Simulator API`).
- **Source Type**: Select `URL`.
- **URL**: Base URL of your PM2 API (e.g., `http://localhost:9561/simulator.json` for the PM2 HTTP API).
     - **Method**: Choose `GET`.

**Optional Authentication**:
   - If your API requires authentication, configure it under **Authentication**:
   - **Basic Auth**: Enable and provide the username and password.
   - **API Token or Custom Headers**: Add any required API tokens or headers.

**Test the Connection**:
   - Click **Save & Test** to verify the connection.
   - Ensure that the data source is able to fetch data successfully from your PM2 API.

---

#### **Querying Data Using Grafana Infinity Datasource**
Once the data source is configured, you can create panels in Grafana to visualize data:

**Create a New Panel**:
   - Click on **Create > Dashboard** and add a new panel.
   - Choose the **Infinity Datasource** as the data source.

**Visualize the Data**:
   - Use Grafana's built-in visualization tools (e.g., time-series graphs, tables, gauges) to display your data.
   - You can also apply transformations or create alerts based on your data.
![Grafana Table](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/exchangesimulator/grafana_table.png)
---

#### **Why Use Grafana Infinity Datasource?**
**Active Development**: The Infinity Datasource is actively maintained and regularly updated.
**Multi-Format Support**: Supports JSON, CSV, XML, GraphQL, and HTML endpoints, making it versatile for various data sources.
**Advanced Features**:
  - Query chaining.
  - Custom transformations.
  - Support for dynamic variables and templating.
**Use PM2 API for Dynamic Data**
   - If you're running your simulator with PM2, leverage the **PM2 HTTP API** to access real-time metrics and logs.

---

#### Nodejs Winston Library for each strategy simulation logs:
This JSON format represents structured logs generated by the Winston library, providing detailed information about the simulator's state at a specific timestamp. 

### Fields:
- **`timestamp`**: When the log was recorded (Unix timestamp in milliseconds).
- **`simulator`**: Name of the simulator (e.g., `bollingerband_simulator`).
- **`profit`**: The profit recorded at the time of logging.
- **`trade_count`**: Number of trades executed.
- **`market_indicator`**: Nested object with market metrics:
- **`RSI`**: Relative Strength Index value.
- **`BollingerBand`**: Current Bollinger Band status (e.g., `upper`).
- **`error`**: Captures any errors; `null` if none occurred. 

#### This JSON format is ideal for real-time monitoring and analysis.
**Winston Library**

#### **Design a Reusable Winston Logger Module**

Created new file in `/strategies/logger.js`:

```js
/**
 * logger.js - Standardized Winston Logger for Strategies
 *
 * This module provides a pre-configured Winston logger to be used across all trading strategies.
 * It ensures consistent logging format, log levels, and output destinations for easier debugging and monitoring.
 * By using this standardized logger, strategies can uniformly record important events, errors, and analytics,
 * improving maintainability and traceability throughout the codebase.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

/**
 * Returns a logger and a function to append data to a JSON file.
 * @param {string} strategyName - Name of the strategy (used for file naming).
 * @returns {object} { logger, appendToJsonFile }
 */
module.exports = function(strategyName) {
  const logFile = path.join(__dirname, `../logs/${strategyName}.log`);
  const jsonFile = path.join(__dirname, `../logs/json/${strategyName}.json`);

  // Ensure directory exists
  fs.ensureFileSync(jsonFile);

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: logFile })
    ]
  });

  function appendToJsonFile(data) {
    let fileData = [];
    if (fs.existsSync(jsonFile)) {
      fileData = JSON.parse(fs.readFileSync(jsonFile, 'utf8') || '[]');
    }
    fileData.push(data);
    fs.writeFileSync(jsonFile, JSON.stringify(fileData, null, 2));
  }

  return { logger, appendToJsonFile };
};
```

---

#### **Use the Logger in Any Strategy**

In your strategy file (e.g., `RSIBULLBEARADX.js`), add:

```js
const { logger, appendToJsonFile } = require('./logger')('rsibullbearadx');
```

---

#### **Output Only Relevant Data for Charting**

When logging, **only include the minimal, useful fields** (timestamp, price, indicators, advice, etc.):

```js
logTrade: function(candle, indicators, advice) {
  const output = {
    time: candle.start,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    advice,
    ...indicators
  };
  logger.info(output);
  appendToJsonFile(output);
}
```
Call `logTrade()` in your `check()` function or wherever you want to log a trade/decision.

---

#### **Example Usage in a Strategy**

```js
// At the top
const { logger, appendToJsonFile } = require('./logger')('rsibullbearadx');

// In your check() method or after advice:
this.logTrade(this.candle, {
  RSI: this.indicators.RSI.result,
  ADX: this.indicators.ADX.result,
  // add more indicators as needed
}, this.trend.direction);
```

---

#### **Benefits**
- **Consistency:** All strategies output the same fields, in the same format.
- **Simplicity:** Advanced charting scripts can ingest JSON logs without parsing irrelevant data.
- **Reusability:** Just require the logger module and call `logTrade()` in any new strategy!

---

#### **Summary Table of Fields to Log for Advanced Charting**

| Field       | Description                  | Example             |
|-------------|------------------------------|---------------------|
| timestamp   | Candle start time            | 1747437523000       |
| open        | Candle open price            | 12345.67            |
| high        | Candle high price            | 12400.00            |
| low         | Candle low price             | 12200.00            |
| close       | Candle close price           | 12380.00            |
| volume      | Candle volume                | 10.5                |
| advice      | Strategy advice (long/short) | "long"              |
| indicators  | Any custom indicator values  | { RSI: 50, ADX: 25 }|

---

#### **How to Add to New Strategies**

Just add at the top:
```js
const { logger, appendToJsonFile } = require('./logger')('mystrategyname');
```
And call your standardized logging function wherever needed.

---

**This approach will save you hours on logging, reviewing, and charting output for any strategy!**  

---

[work in progress ]
#### **Advanced Charting Features**
Grafana excels in advanced charting with features like:
**Annotations**:
   - Mark significant events (e.g., market crashes, system errors) on your charts.
   - Add annotations via Grafana’s UI or through Elasticsearch tags.

**Thresholds**:
   - Add visual thresholds (e.g., RSI > 70 is overbought) directly on your charts.
   - Use color-coding (e.g., red for overbought, green for oversold).

**Data Transformations**:
   - Use Grafana's built-in transformation tools to compute metrics on the fly (e.g., moving averages, deltas).

**Dynamic Variables**:
   - Create dropdowns for selecting simulators, time ranges, or market indicators dynamically.

---

#### Conclusion
**Switching** to Grafana can provide you with:
- Real-time, interactive visualizations.
- Advanced charting and alerting capabilities.
- The ability to combine financial data, simulator logs, and market indicators into intuitive dashboards.
