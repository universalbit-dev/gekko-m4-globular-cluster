const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');// Adjust path as needed

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const DATA_PATH = path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');

function trainAndSave() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) {
    console.error('Failed to read or parse ohlcv_ccxt_data.json:', e.message);
    return;
  }

  // Prepare training data
  const trainingSet = data
    .filter(c => typeof c.label !== 'undefined')
    .map(candle => ({
      input: [candle.open, candle.high, candle.low, candle.close, candle.volume],
      output: candle.label // integer: 0, 1, or 2
    }));

  if (trainingSet.length === 0) {
    console.warn('No labeled data found for training.');
    return;
  }

  // Ensure model directory exists
  fs.mkdirSync(MODEL_DIR, { recursive: true });

  // Create network
  const net = new ConvNet.Net();
  const layer_defs = [
    { type: 'input', out_sx: 1, out_sy: 1, out_depth: 5 },
    { type: 'fc', num_neurons: 16, activation: 'relu' },
    { type: 'softmax', num_classes: 3 }
  ];
  net.makeLayers(layer_defs);

  const trainer = new ConvNet.Trainer(net, {
    method: 'adadelta',
    batch_size: 10,
    l2_decay: 0.001
  });

  for (let epoch = 0; epoch < 10; epoch++) {
    trainingSet.forEach(example => {
      trainer.train(example.input, example.output);
    });
    console.log(`Epoch ${epoch + 1} complete`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(MODEL_DIR, `trained_ccxt_ohlcv_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(net.toJSON()));
  console.log(`[${timestamp}] Model Saved as ${filename}`);
}

// Initial run
trainAndSave();
setInterval(trainAndSave, INTERVAL_MS);
