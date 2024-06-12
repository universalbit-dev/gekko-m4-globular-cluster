module.exports = {
  apps : [{
    name: 'import',
    script    : 'gekko.js',
    args      : '-c ecosystem/import/import.js -i',
    name      : '|- import exchange data -|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },
          
  {
  name: 'inverter',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_inverter.js -b',
  name      : '|INVERTER|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
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
  name: 'rsibullbearadx',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_rsibullbearadx.js -b',
  name      : '|RSIBULLBEARADX|-backtest-',
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
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_noop.js -b',
  name      : '|NOOP|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  }

]

}
