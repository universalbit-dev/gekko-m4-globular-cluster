module.exports = {
  apps : [
    {
      name: 'neuralnet_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_neuralnet_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'cci_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_cci_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'dema_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_dema_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'rsibullbearadx_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_rsibullbearadx_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'bollingerband_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_bollingerband_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'noop_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_noop_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'neuralnet_refinements_simulator',
      script: 'gekko.js',
      args: '-c env/simulator/trade_neuralnet_simulator.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: "csvexport",
      script: 'gekko.js',
      args: '-c env/simulator/trade_csvexport.js',
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: "pm2-cpu-watchdog",
      script: "pm2-cpu-watchdog.js",
      instances: "1",
      exec_mode: "cluster",
    },
    {
      name: 'ccxt_orders',
      script: 'tools/ccxt_orders.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'challenge_analysis',
      script: 'tools/challenge_analysis.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'challenge_log_writer',
      script: 'tools/challenge_log_writer.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'chart_ccxt_recognition',
      script: 'tools/chart_ccxt_recognition.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'chart_ccxt_recognition_magnitude',
      script: 'tools/chart_ccxt_recognition_magnitude.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'chart_recognition',
      script: 'tools/chart_recognition.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'label_ohlcv',
      script: 'tools/label_ohlcv.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'pm2-tools-watchdog',
      script: 'tools/pm2-tools-watchdog.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'tools.config',
      script: 'tools/tools.config.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train_ccxt_ohlcv',
      script: 'tools/train_ccxt_ohlcv.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train_ccxt_ohlcv_tf',
      script: 'tools/train_ccxt_ohlcv_tf.js',
      instances: "1",
      exec_mode: "cluster"
    },
    {
      name: 'train_ohlcv',
      script: 'tools/train_ohlcv.js',
      instances: "1",
      exec_mode: "cluster"
    }
  ]
}
