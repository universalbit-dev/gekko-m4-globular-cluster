module.exports = {
  apps : [
    {
      name: 'ccxt_orders',
      script: 'ccxt_orders.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'challenge_analysis',
      script: 'challenge_analysis.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'challenge_log_writer',
      script: 'challenge_log_writer.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'chart_ccxt_recognition',
      script: 'chart_ccxt_recognition.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'chart_ccxt_recognition_magnitude',
      script: 'chart_ccxt_recognition_magnitude.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'chart_recognition',
      script: 'chart_recognition.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'label_ohlcv',
      script: 'label_ohlcv.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'pm2-tools-watchdog',
      script: 'pm2-tools-watchdog.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'tools.config',
      script: 'tools.config.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train_ccxt_ohlcv',
      script: 'train_ccxt_ohlcv.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train_ccxt_ohlcv_tf',
      script: 'train_ccxt_ohlcv_tf.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train_ohlcv',
      script: 'train_ohlcv.js',
      instances: "1",
      exec_mode: "cluster"
    }
  ]
}
