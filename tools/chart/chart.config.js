module.exports = {
  apps: [
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
    },
    {
      name: "chart_recognition",
      script: "chart_recognition.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "multi_timeframe_ohlcv",
      script: "multi_timeframe_ohlcv.js",
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
