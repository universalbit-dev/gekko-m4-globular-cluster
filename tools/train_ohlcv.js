// train_ohlcv.js
require('dotenv').config();
const fs = require('fs');
const ConvNet = require('../core/convnet.js'); // Adjust path as needed

const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 3600000; // default 1h
const filePath='../logs/json/ohlcv/ohlcv_data.json';
// Check once at the top level of your script
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, '[]', 'utf8');
}
function trainAndSave() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync('../logs/json/ohlcv/ohlcv_data.json', 'utf8'));
  } catch (e) {
    console.error('Failed to read or parse ohlcv_data.json:', e.message);
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
  for(let epoch = 0; epoch < 10; epoch++) {
    trainingSet.forEach(example => {
      trainer.train(example.input, example.output);
    });
    console.log(`Epoch ${epoch+1} complete`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `./trained_ohlcv/trained_ohlcv_${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(net.toJSON()));
  console.log(`[${timestamp}] Model Saved as ${filename}`);
}

/*
example output:
[2025-06-07T07-31-03-634Z] Model Saved as ./trained_ohlcv/trained_ohlcv_2025-06-07T07-31-03-634Z.json
*/

// Initial run
trainAndSave();

// Repeat every INTERVAL_MS
setInterval(trainAndSave, INTERVAL_MS);
