module.exports = {
  apps : [{
    name: 'import',
    script    : 'gekko.js',
    args      : '-c ecosystem/import/import.js',
    name      : '|- import exchange data -|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  },
          
  {
  name: 'inverter',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_inverter.js',
  name      : '|INVERTER|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
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
  name: 'nnstoch',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nnstoch.js',
  name      : '|NNSTOCH|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },


  {
  name: 'nncci',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nncci.js',
  name      : '|NNCCI|-backtest-|',
  instances : "1",
  exec_mode : "cluster"
  },

  {
  name: 'nntma',
  script    : 'gekko.js',
  args      : '-c ecosystem/backtest/backtest_nntma.js',
  name      : '|NNTMA|-backtest-|',
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
