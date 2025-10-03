module.exports = {
  apps : [
    {
      name: 'challenge_analysis',
      script: 'challenge/challenge_analysis.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'challenge_log_writer',
      script: 'challenge/challenge_log_writer.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'chart_recognition',
      script: 'chart/chart_recognition.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'label_ohlcv',
      script: 'train/label_ohlcv.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'label_ohlcv_multi',
      script: 'train/label_ohlcv_multi.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'pm2-tools-watchdog',
      script: 'pm2-tools-watchdog.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'train_ccxt_ohlcv',
      script: 'train/train_ccxt_ohlcv.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'train_ccxt_ohlcv_tf',
      script: 'train/train_ccxt_ohlcv_tf.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'train_ohlcv',
      script: 'train/train_ohlcv.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'train_multi_timeframe_ohlcv',
      script: 'train/multi_timeframe_ohlcv.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
      TF_CPP_MIN_LOG_LEVEL: '2'
      }
    },
    {
      name: 'explorer',
      script: 'explorer.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'macrostructure',
      script: 'macro_ccxt_orders.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'backtesting',
      script: 'backtotesting.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'microstructure',
      script: 'microstructure/micro_ccxt_orders.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'index',
      script: 'microstructure/index.js',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'evaluation',
      script: 'evaluation/evaluate.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'autoTune',
      script: 'evaluation/autoTune.js',
      instances: 1,
      exec_mode: 'cluster'
    }
  ]
}
