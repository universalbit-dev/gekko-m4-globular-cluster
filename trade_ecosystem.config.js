module.exports = {
  apps : [
  {
    name: 'inverter',
    script    : 'gekko.js',
    args      : '-c .env/trade/trade_inverter.js',
    name      : '|INVERTER|-realtime-|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },
  {
  name: 'stochrsi',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_stochrsi.js',
  name      : '|STOCHRSI|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'dema',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_dema.js',
  name      : '|DEMA|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'nn',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_nn.js',
  name      : '|NN|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'neuralnetv2',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_neuralnetv2.js',
  name      : '|NEURALNETV2|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'supertrend',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_supertrend.js',
  name      : '|SUPERTREND|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'rsibullbearadx',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_rsibullbearadx.js',
  name      : '|RSIBULLBEARADX|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'scalper',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_scalper.js',
  name      : '|SCALPER|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_noop.js',
  name      : '|NOOP|-realtime-|',
  instances : "1",
  exec_mode : "cluster"
  }
]
}

