//train_ccxt_ohlcv.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const ConvNet = require('../../core/convnet.js');

const TRAIN_INTERVAL_MS = parseInt(process.env.TRAIN_INTERVAL_MS, 10) || 3600000; // default 1h
const filePath = path.resolve(__dirname, '../../logs/json/ohlcv/ohlcv_ccxt_data.json');
const dir = path.resolve(__dirname, '../trained/trained_ccxt_ohlcv');

// Ensure the logs file exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, '[]', 'utf8');
}

function trainAndSave() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('Failed to read or parse ohlcv_ccxt_data.json:', e.message);
    return;
  }

  // Prepare training data
  const trainingSet = data
    .filter(candle => typeof candle.label !== 'undefined')
    .map(candle => ({
      input: [candle.open, candle.high, candle.low, candle.close, candle.volume],
      output: candle.label // integer: 0, 1, or 2
    }));

  // Create and configure network
  const net = new ConvNet.Net();
  const layer_defs = [
    { type: 'input', out_sx: 1, out_sy: 1, out_depth: 5 },
    { type: 'conv', sx: 1, filters: 16, activation: 'relu' },
    { type: 'fc', num_neurons: 16, activation: 'relu' },
    { type: 'fc', num_neurons: 16, activation: 'relu' },
    { type: 'fc', num_neurons: 16, activation: 'relu' },
    { type: 'softmax', num_classes: 3 }
  ];
  net.makeLayers(layer_defs);

  const trainer = new ConvNet.Trainer(net, {
    method: 'adadelta',
    batch_size: 10,
    l2_decay: 0.001
  });

  // Training loop
  for (let epoch = 0; epoch < 10; epoch++) {
    trainingSet.forEach(example => {
      trainer.train(example.input, example.output);
    });
    console.log(`Epoch ${epoch + 1} complete`);
  }

  // Ensure the directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dir, `trained_ccxt_ohlcv_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(net.toJSON()));
  console.log(`[${timestamp}] Model Saved as ${filename}`);
}

// Initial run
trainAndSave();

// Repeat every TRAIN_INTERVAL_MS
