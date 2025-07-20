module.exports = {
  apps : [
  {
  name: 'train ccxt ohlcv',
  script    : 'train_ccxt_ohlcv.js',
  instances : "1",
  exec_mode : "fork"
  },
  {
  name: 'train ohlcv',
  script    : 'train_ohlcv.js',
  instances : "1",
  exec_mode : "fork"
  },
  {
  name: 'chart recognition',
  script    : 'chart_recognition.js',
  instances : "1",
  exec_mode : "fork"
  },
  {
  name: 'chart ccxt recognition',
  script: 'chart_ccxt_recognition.js',
  instances: "1",
  exec_mode: 'fork',
  },
  {
  name: 'chart ccxt recognition magnitude',
  script: 'chart_ccxt_recognition_magnitude.js',
  instances: "1",
  exec_mode: 'fork',
  },
  {
  name: 'pm2-tools-watchdog',
  script    : 'pm2-tools-watchdog.js',
  instances : "1",
  exec_mode : "fork"
  },
]
}
