module.exports = {
  apps : [
  {
    name: 'inverter',
    script    : 'gekko.js',
    args      : '-c env/backtest/backtest_inverter.js -b',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },
  {
  name: 'stochrsi',
  script    : 'gekko.js',
  args      : '-c env/backtest/backtest_stochrsi.js -b',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'rsibullbearadx',
  script    : 'gekko.js',
  args      : '-c env/backtest/backtest_rsibullbearadx.js -b',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'nn',
  script    : 'gekko.js',
  args      : '-c env/backtest/backtest_nn.js -b',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'dema',
  script    : 'gekko.js',
  args      : '-c env/backtest/backtest_dema.js -b',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'supertrend',
  script    : 'gekko.js',
  args      : '-c env/backtest/backtest_supertrend.js -b',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c env/backtest/backtest_noop.js -b',
  instances : "1",
  exec_mode : "cluster"
  }
]

}
