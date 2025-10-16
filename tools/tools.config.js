module.exports = {
  apps: [
    {
      name: 'explorer ccxt data multiple timeframes data',
      script: 'explorer.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'challenge convnet and tensorflowjs',
      script: 'challenge/challenge_analysis.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'challenge logger',
      script: 'challenge/challenge_log_writer.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'chart recognition',
      script: 'chart/chart_recognition.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'chart ccxt recognition',
      script: 'chart/chart_ccxt_recognition.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'chart ccxt recognition multiple',
      script: 'chart/chart_ccxt_multi.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'chart ccxt magnitude',
      script: 'chart/chart_ccxt_recognition_magnitude.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'labeling multiple timeframes ohlcv data',
      script: 'train/label_ohlcv_multi.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: "label_ohlcv_aggregate",
      script: "train/label_ohlcv_aggregate.js",
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train simulator ohlcv data',
      script: 'train/train_ohlcv.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        TF_CPP_MIN_LOG_LEVEL: '2'
      }
    },
    {
      name: 'train ccxt ohlcv data',
      script: 'train/train_ccxt_ohlcv.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        TF_CPP_MIN_LOG_LEVEL: '2'
      }
    },
    {
      name: 'convnet and tensorflowjs',
      script: 'train/train_ccxt_ohlcv_tf.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        TF_CPP_MIN_LOG_LEVEL: '2'
      }
    },
    {
      name: 'macrostructure',
      script: 'macro_ccxt_orders.js',
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
      name: 'microstructure-orchestrator',
      script: 'microstructure/index.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'backtest',
      script: 'backtest/backtotesting.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'CPU watchdog',
      script: 'pm2-tools-watchdog.js',
      instances: 1,
      exec_mode: 'cluster'
    }
  ]
};
