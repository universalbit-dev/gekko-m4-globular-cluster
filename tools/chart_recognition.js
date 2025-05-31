// chart_recognition.js
const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js'); // adjust path if needed

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_data.csv');
const JSON_PATH = path.join(__dirname, '../logs/json/ohlcv/ohlcv_data.json');
const MODEL_PATH = path.join(__dirname, './trained_ohlcv.json');
const OUT_CSV_PATH = path.join(__dirname, './ohlcv_data_prediction.csv');
const LABELS = ['bull', 'bear', 'idle'];

// Step 1: Load CSV file
function loadCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Remove header if present
  if (rows.length && isNaN(Number(rows[0].split(',')[1]))) rows.shift();
  return rows;
}

// Step 2: Convert CSV to JSON and save
function csvToJson(rows, jsonPath) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const candles = rows.map(line => {
    const [timestamp, open, high, low, close, volume] = line.split(',');
    return {
      timestamp,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    };
  });
  fs.writeFileSync(jsonPath, JSON.stringify(candles, null, 2));
  console.log('Wrote JSON:', jsonPath);
  return candles;
}

// Step 3: Load convnet.js model
function loadModel(modelPath) {
  if (!fs.existsSync(modelPath)) {
    console.warn('No trained model found. Skipping prediction step.');
    return null;
  }
  const modelJson = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const net = new ConvNet.Net();
  net.fromJSON(modelJson);
  return net;
}

// Step 4: Predict using the model
function predictAll(candles, model) {
  return candles.map(candle => {
    const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
    const x = new ConvNet.Vol(input);
    const out = model.forward(x);
    const probs = out.w;
    const idx = probs.indexOf(Math.max(...probs));
    return LABELS[idx];
  });
}

// Step 5: Write predictions to enhanced CSV
function writeEnhancedCsv(rows, predictions, outCsvPath) {
  const header = 'timestamp,open,high,low,close,volume,prediction\n';
  const out = rows.map((row, i) => `${row},${predictions[i]}`).join('\n');
  fs.writeFileSync(outCsvPath, header + out + '\n');
  console.log('Wrote predicted CSV:', outCsvPath);
}

// Main
(function main() {
  try {
    const rows = loadCsvRows(CSV_PATH);
    const candles = csvToJson(rows, JSON_PATH);

    const model = loadModel(MODEL_PATH);

    if (model) {
      const predictions = predictAll(candles, model);
      writeEnhancedCsv(rows, predictions, OUT_CSV_PATH);
    } else {
      console.log('Prediction CSV not generated because no trained model was found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
