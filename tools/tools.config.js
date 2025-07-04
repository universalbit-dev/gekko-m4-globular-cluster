module.exports = {
  apps : [
  {
  name: 'label ccxt data',
  script    : 'label_ccxt_data.js',
  instances : "max",
  exec_mode : "cluster",
  },
  {
  name: 'train ccxt ohlcv',
  script    : 'train_ccxt_ohlcv.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/15 * * * *',//15min
  autorestart: false
  },
  {
  name: 'train ohlcv',
  script    : 'train_ohlcv.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/15 * * * *',//15min
  autorestart: false
  },
  {
  name: 'chart ccxt recognition',
  script: 'chart_ccxt_recognition.js',
  instances: "max",
  exec_mode: 'cluster',
  cron_restart: '*/15 * * * *',//15min
  autorestart: false
  },
  {
  name: 'chart recognition',
  script    : 'chart_recognition.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/15 * * * *',//15min
  autorestart: false
  },
  {
  name: 'pm2-tools-watchdog',
  script    : 'pm2-tools-watchdog.js',
  instances : "max",
  exec_mode : "cluster"
  },
]
}
