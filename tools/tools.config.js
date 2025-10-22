module.exports = {
  apps: [
    {
      name: 'explorer ccxt data multiple timeframes data',
      script: 'explorer.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'challenge',
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
      name: 'autotune',
      script: 'evaluation/autoTune.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'evaluate',
      script: 'evaluation/evaluate.js',
      instances: 1,
      exec_mode: 'cluster'
    },
    {
      name: 'train-runner',
      script: 'train.sh',
      interpreter: '/bin/bash',
      args: '--all --verbose --parallel',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false
    },
    {
      name: "chart_ccxt_multi",
      script: "chart_ccxt_multi.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "chart_ccxt_recognition",
      script: "chart_ccxt_recognition.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "chart_ccxt_recognition_magnitude",
      script: "chart_ccxt_recognition_magnitude.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
