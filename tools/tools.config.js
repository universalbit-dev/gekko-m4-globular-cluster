module.exports = {
  apps : [
  {
  name: 'train ccxt ohlcv',
  script    : 'train_ccxt_ohlcv.js',
  args      : '',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'train ohlcv',
  script    : 'train_ohlcv.js',
  args      : '',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'chart ccxt recognition',
  script    : 'chart_ccxt_recognition.js',
  args      : '',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'chart recognition',
  script    : 'chart_recognition.js',
  args      : '',
  instances : "1",
  exec_mode : "cluster"
  },
]
}
