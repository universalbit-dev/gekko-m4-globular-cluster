### Gekko-M4-Globular-Cluster [NGC 6121]
#### Log Management **Grafana Advanced Charting**
[work in progress]

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

#### PM2 HTTP API for Logs and Metrics
PM2 includes a built-in **API endpoint** that you can enable to access logs, metrics, and process information over HTTP. By enabling this API, you can bypass the need for Filebeat or other log shippers because your application logs and metrics can be queried directly by tools like Grafana or any custom Grafana Infinity Datasource client.

---

#### Benefits of Using PM2's HTTP API
**Reduced Dependencies**:
- No need for external tools like Filebeat or Logstash to ship logs.
- PM2 directly exposes logs and metadata over HTTP.

**Real-Time Access**:
- The PM2 API provides real-time access to logs and process metrics, which can be directly consumed by your monitoring tools.

**Integrates with Grafana**:
- Use Grafana’s **Grafana Infinity Datasource JSON** to query the PM2 HTTP endpoint and visualize logs and metrics.

**Simplified Setup**:
   - You don’t need to set up and configure log shippers or additional pipelines.

---

#### How to Enable PM2 HTTP API
**Install the PM2 Plus Module**:
PM2 includes the HTTP API as part of its **PM2 Plus** feature. 
You can enable it like this:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

**Start PM2 in API Mode**:
- Start PM2 with the API server enabled:
   ```bash
   pm2 start simulator.config.js --watch
   ```

**Access Logs via HTTP**:
- The logs will be available through the PM2 HTTP endpoint. By default, this API listens on port **9615**, but you can configure it if needed.

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
     - **URL**: Base URL of your PM2 API (e.g., `http://localhost:9615` for the PM2 HTTP API).
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

**Define the Query**:
   - Select the **Format** (e.g., JSON) based on your PM2 API response.
   - Enter the API endpoint path (e.g., `/api/v1/metrics` or `/logs`).
   - Set any query parameters required by your API.

**Visualize the Data**:
   - Use Grafana's built-in visualization tools (e.g., time-series graphs, tables, gauges) to display your data.
   - You can also apply transformations or create alerts based on your data.

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
   - Enable the PM2 API to expose an endpoint, such as `/api/v1/metrics`, which provides process information and logs.
   - Ensure the PM2 API is configured to return structured data, including fields like `timestamp`, `metric_name`, and `value` for easy integration with monitoring tools like Grafana.

---

#### Nodejs Winston Library Ad Hoc JSON logs:
This JSON format represents structured logs generated by the Winston library, providing detailed information about the simulator's state at a specific timestamp. 

### Fields:
- **`timestamp`**: When the log was recorded (ISO 8601 format).
- **`simulator`**: Name of the simulator (e.g., `bollingerband_simulator`).
- **`profit`**: The profit recorded at the time of logging.
- **`trade_count`**: Number of trades executed.
- **`market_indicator`**: Nested object with market metrics:
- **`RSI`**: Relative Strength Index value.
- **`BollingerBand`**: Current Bollinger Band status (e.g., `upper`).
- **`error`**: Captures any errors; `null` if none occurred. 

#### This JSON format is ideal for real-time monitoring and analysis.
**Winston Library**

code snippet using the **Winston** library to generate and log structured JSON data in the provided format:

### Code Example:
```javascript
const winston = require('winston');

// Create a Winston logger
const logger = winston.createLogger({
  level: 'info', // Set the logging level (e.g., info, error, debug)
  format: winston.format.json(), // Use JSON format for logs
  transports: [
    // Log to a file
    new winston.transports.File({ filename: 'simulator.log' }),
    // Log to the console
    new winston.transports.Console()
  ]
});

// Example function to log simulator data
function logSimulatorData() {
  const logData = {
    timestamp: new Date().toISOString(), // Current timestamp in ISO 8601 format
    simulator: "bollingerband_simulator", // Name of the simulator
    profit: 50.50, // Example profit value
    trade_count: 20, // Number of trades executed
    market_indicator: {
      RSI: 65, // Relative Strength Index value
      BollingerBand: "upper" // Bollinger Band position
    },
    error: null // No errors (set to null if no error occurred)
  };

  // Log the structured data
  logger.info(logData);
}

// Call the function to log the data
logSimulatorData();
```

---

### Key Features:
1. **Structured Logging**:
   - The log entry is saved in JSON format, making it easy to parse and analyze.
   
2. **Multiple Transports**:
   - Logs are written to both the console and a file (`simulator.log`).

3. **Timestamp**:
   - Automatically generates the current timestamp in ISO 8601 format.

4. **Custom Data**:
   - Includes fields like `simulator`, `profit`, `trade_count`, `market_indicator`, and `error`.

---

### Output in `simulator.log`:
```json
{
  "timestamp": "2025-05-14T14:45:00.000Z",
  "simulator": "bollingerband_simulator",
  "profit": 50.50,
  "trade_count": 20,
  "market_indicator": {
    "RSI": 65,
    "BollingerBand": "upper"
  },
  "error": null
}
```

You can modify the `logSimulatorData()` function to dynamically update log values based on your simulator's output.

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

### **Proposals for Financial Data Dashboards**
Here are some tailored proposals for your **financial simulator**:

#### **Profitability Analysis**
- KPIs:
- Total Profit/Loss
- Profit per Simulator
- Visualizations:
- Line Chart: `profit` over time.
- Bar Chart: `profit` per simulator.

#### **Trading Performance**
- KPIs:
- Total Trades
- Success Rate (win/loss ratio).
- Visualizations:
- Pie Chart: Success rate.
- Heatmap: Trade frequency by simulator.

#### **Market Indicator Trends**
- KPIs:
- RSI
- Bollinger Bands
- Visualizations:
- Multi-Line Chart: RSI values and Bollinger Band positions.
- Gauge: Current RSI.
---

#### Conclusion
**Switching** to Grafana can provide you with:
- Real-time, interactive visualizations.
- Advanced charting and alerting capabilities.
- The ability to combine financial data, simulator logs, and market indicators into intuitive dashboards.
