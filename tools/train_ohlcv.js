// train_ohlcv.js
const fs = require('fs');
const ConvNet = require('../core/convnet.js'); // Adjust path as needed

const data = JSON.parse(fs.readFileSync('../logs/json/ohlcv/ohlcv_data.json', 'utf8'));

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

// Save the model
fs.writeFileSync('./trained_ohlcv.json', JSON.stringify(net.toJSON()));
console.log('Model Saved');
