const convnetjs = require('../../../core/convnet.js');
const math = require('mathjs');

class NeuralNetStrategy {
  constructor(settings = {}) {
    // You can load model params, weights, or pass settings here
    this.d = settings.depth || 5;
    this.batchsize = 1;
    this.layer_neurons = settings.layer_neurons || 5;
    this.layer_activation = settings.layer_activation || 'tanh';
    this.scale = 1;
    this.priceBuffer = [];
    this.predictionCount = 0;
    this.prevAction = 'hold';
    this.prevPrice = 0;
    this.hodle_threshold = settings.hodle_threshold || 1;
    this.min_predictions = settings.min_predictions || 20;
    this.threshold_buy = settings.threshold_buy || 0.1;
    this.threshold_sell = settings.threshold_sell || -0.1;

    const layers = [
      { type: 'input', out_sx: 1, out_sy: 1, out_depth: this.d },
      { type: 'fc', num_neurons: this.layer_neurons, activation: this.layer_activation },
      { type: 'regression', num_neurons: 1 }
    ];
    this.nn = new convnetjs.Net();
    this.nn.makeLayers(layers);
    this.trainer = new convnetjs.SGDTrainer(this.nn, {
      learning_rate: settings.learning_rate || 0.01,
      momentum: settings.momentum || 0.1,
      batch_size: this.batchsize,
      l2_decay: settings.decay || 0.001
    });
  }

  setNormalizeFactor(candle) {
    this.scale = Math.pow(10, Math.trunc(candle.high).toString().length + 2);
  }

  update(candle) {
    if (this.scale === 1 && candle.high > 1 && this.predictionCount === 0) this.setNormalizeFactor(candle);

    this.priceBuffer.push([
      (candle.low / this.scale),
      (candle.high / this.scale),
      (candle.close / this.scale),
      (candle.open / this.scale),
      (candle.volume / 1000)
    ]);

    if ((this.d * 2) > this.priceBuffer.length) return;

    for (let i = 0; i < (this.d * 3); ++i) {
      for (let j = 0; j < this.priceBuffer.length - this.d; j++) {
        let data = this.priceBuffer[j];
        let current_price = this.priceBuffer[j + 1];
        let vol = new convnetjs.Vol(data);
        this.trainer.train(vol, current_price[2]); // Use close price as target
        this.nn.forward(vol);
        this.nn.backward();
        this.predictionCount++;
      }
    }

    while (this.priceBuffer.length > 30) this.priceBuffer.shift();
  }

  predict() {
    if (this.priceBuffer.length < this.d) return null;
    let vol = new convnetjs.Vol(this.priceBuffer[this.priceBuffer.length - this.d]);
    let prediction = this.nn.forward(vol);
    return prediction.w[0] * this.scale;
  }

  getAdvice(candle) {
    let advice = 'hold';
    if (this.predictionCount > this.min_predictions) {
      let prediction = this.predict();
      if (!prediction) return { advice, prediction, currentPrice: candle.close };
      let currentPrice = candle.close;
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (meanp - currentPrice) / currentPrice * 100;

      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice * this.hodle_threshold);

      let signal = meanp < currentPrice;
      if (this.prevAction !== 'open' && signal === false && meanAlpha > this.threshold_buy) {
        advice = 'open';
        this.prevAction = 'open';
        this.prevPrice = currentPrice;
      } else if (this.prevAction !== 'close' && signal === true && meanAlpha < this.threshold_sell && signalSell) {
        advice = 'close';
        this.prevAction = 'close';
        this.prevPrice = currentPrice;
      }
    }
    return { advice, prediction: this.predict(), currentPrice: candle.close };
  }

  // For batch backtest: process an array of candles and output [{advice, ...}, ...]
  evaluate(candles) {
    const results = [];
    for (const candle of candles) {
      this.update(candle);
      const out = this.getAdvice(candle);
      results.push({ ...out, time: candle.start, price: candle.close });
    }
    return results;
  }
}

module.exports = function(candles, params) {
  // params comes from paramSets in backtotesting.js
  const nn = new NeuralNetStrategy(params);
  return nn.evaluate(candles);
};
