module.exports = {
  apps : [{
    name: "inverter",
    script    : 'gekko.js',
    args      : '-c ecosystem/backtest/backtest_inverter.js -b',
    name      : '|INVERTER|-backtest-|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },

  {
  name: 'stochrsi',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_stochrsi.js -b',
  name      : '|STOCHRSI|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'nnstoch',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nnstoch.js -b',
  name      : '|NNSTOCH|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'nncci',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nncci.js -b',
  name      : '|NNCCI|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'nntma',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nntma.js -b',
  name      : '|NNTMA|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },
  
  {
  name: 'nn',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nn.js -b',
  name      : '|NN|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  }

]}

