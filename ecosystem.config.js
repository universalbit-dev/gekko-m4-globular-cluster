module.exports = {
  apps : [
  {
    name: 'inverter',
    script    : 'gekko.js',
    args      : '-c ecosystem/backtest/backtest_inverter.js',
    name      : '|INVERTER|-backtest-|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },

  {
  name: 'stochrsi',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_stochrsi.js',
  name      : '|STOCHRSI|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'dema',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_dema.js',
  name      : '|DEMA|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'supetrend',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_supertrend.js',
  name      : '|SUPERTREND|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'nndema',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nndema.js',
  name      : '|NNDEMA|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'rsibullbearadx',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_rsibullbearadx.js',
  name      : '|RSIBULLBEARADX|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_noop.js',
  name      : '|NOOP|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  }

]

}
