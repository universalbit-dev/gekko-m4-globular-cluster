module.exports = {
  apps : [
  {
    name: 'inverter',
    script    : 'gekko.js',
    args      : '-c ecosystem/trade/trade_inverter_simulator.js',
    name      : '|INVERTER|-simulator-|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },

  {
  name: 'stochrsi',
  script    : 'gekko.js',
  args      : '-c ecosystem/trade/trade_stochrsi_simulator.js',
  name      : '|STOCHRSI|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  },
  
  {
  name: 'dema',
  script    : 'gekko.js',
  args      : '-c ecosystem/trade/trade_dema_simulator.js',
  name      : '|DEMA|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  },
  
  {
  name: 'nn',
  script    : 'gekko.js',
  args      : '-c ecosystem/trade/trade_nn_simulator.js',
  name      : '|NN|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'supertrend',
  script    : 'gekko.js',
  args      : '-c ecosystem/trade/trade_supertrend_simulator.js',
  name      : '|SUPERTREND|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'rsibullbearadx',
  script    : 'gekko.js',
  args      : '-c ecosystem/trade/trade_rsibullbearadx_simulator.js',
  name      : '|RSIBULLBEARADX|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c ecosystem/trade/trade_noop.js',
  name      : '|NOOP|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  }

]

}
