module.exports = {
  apps : [
  {
  name: 'neuralnet_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_neuralnet_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'cci_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_cci_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'dema_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_dema_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name : 'rsibullbearadx_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_rsibullbearadx_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'bollingerband_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_bollingerband_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'noop_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_noop_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'neuralnet_refinements_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_neuralnet_simulator.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: "csvexport",
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_csvexport.js',
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: "pm2-cpu-watchdog",
  script    : "pm2-cpu-watchdog.js",
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'train ccxt ohlcv',
  script    : 'tools/train_ccxt_ohlcv.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'train ccxt ohlcv tf',
  script    : 'tools/train_ccxt_ohlcv_tf.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'train ohlcv',
  script    : 'tools/train_ohlcv.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'challenge_analysis',
  script    : 'tools/challenge_analysis.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'chart recognition',
  script    : 'tools/chart_recognition.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'chart ccxt recognition',
  script: 'tools/chart_ccxt_recognition.js',
  instances: "1",
  exec_mode: 'cluster',
  },
  {
  name: 'chart ccxt recognition magnitude',
  script: 'tools/chart_ccxt_recognition_magnitude.js',
  instances: "1",
  exec_mode: 'cluster',
  },
  {
  name: 'pm2-tools-watchdog',
  script    : 'tools/pm2-tools-watchdog.js',
  instances : "1",
  exec_mode : "cluster"
  }
]
}
