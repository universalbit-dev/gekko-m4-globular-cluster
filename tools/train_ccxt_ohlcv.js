// train_ccxt_ohlcv.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const dir = path.resolve(__dirname, 'trained_ccxt_ohlcv'); 
const ConvNet = require('../core/convnet.js');


// IMPORTANT: INTERVAL_MS must be the same in all related scripts for consistent signal processing and order logic.
// Set INTERVAL_MS in .env to synchronize intervals.
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 3600000; // default 1h
const filePath = path.resolve(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
// Check once at the top level of your script
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, '[]', 'utf8');
}
function trainAndSave() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync('./logs/json/ohlcv/ohlcv_ccxt_data.json', 'utf8'));
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

  // Create network
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

  // Training loop (simple)
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

/*
[2025-07-28T08-53-03-609Z] Model Saved as trained_ccxt_ohlcv/trained_ccxt_ohlcv_2025-07-28T08-53-03-609Z.json
*/

// Initial run
trainAndSave();

// Repeat every INTERVAL_MS
setInterval(trainAndSave, INTERVAL_MS);
