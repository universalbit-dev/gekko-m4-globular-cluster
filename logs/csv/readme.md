# 📊 CSV Data Export for Grafana Advanced Charting

## Why Use CSV Export Instead of JSON?

While JSON files are great for storing detailed data, they can quickly become very large and unwieldy for visualization tools like Grafana. CSV (Comma-Separated Values) files provide a lighter, more focused alternative—making your data easier to manage and visualize.

**Benefits of CSV for Grafana:**
- **Smaller File Size:** CSV contains only the data you need for charting, without the extra structure and metadata of JSON.
- **Faster Processing:** Grafana and other BI tools can read and plot CSV data much more quickly.
- **Easier to Optimize:** You can select only relevant columns (such as timestamp, open, high, low, close, volume) for more efficient visualizations.

## How Does the CSV Export Work?

- The strategy automatically creates or updates a file called `ohlcv_data.csv` as market data is processed.
- Each row in the CSV corresponds to a single market "candle" and includes:
  - `timestamp`
  - `open`
  - `high`
  - `low`
  - `close`
  - `volume`
- The file is managed with a rotating file stream, ensuring your logs don’t grow indefinitely—old data can be archived or compressed as needed.

## Example: CSV File Format
```csv
timestamp,open,high,low,close,volume
2025-05-23T20:01:03.000Z,34000,34500,33900,34400,1.23
2025-05-23T20:02:03.000Z,34400,34600,34200,34550,1.10
```

## Optimizing CSV for Visualization

- **Select Only Needed Columns:** Remove unnecessary fields to keep the file lean and focused.
- **Aggregate Data if Needed:** You can export data at different time intervals (1m, 5m, 1h) depending on your charting requirements.
- **Keep Time Format Consistent:** Use timestamps or ISO date strings that Grafana can parse easily.

## Importing CSV into Grafana

Grafana supports CSV data sources via plugins such as the [CSV Data Source plugin](https://grafana.com/grafana/plugins/marcusolsson-csv-datasource/). Simply point Grafana to your `ohlcv_data.csv` file and start building your advanced charts!

---

**Summary:**  
Exporting OHLCV market data to CSV is a practical, efficient alternative to bulky JSON files—especially when your goal is fast, flexible visualization in Grafana. Keep your CSV files clean and organized for the best charting experience!

---
