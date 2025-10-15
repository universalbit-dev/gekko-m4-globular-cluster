module.exports = {
  apps: [
    {
      name: "train_ccxt_ohlcv_tf",
      script: "train_ccxt_ohlcv_tf.js",
      instances: "1",
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "train_ccxt_ohlcv_ir",
      script: "train_ccxt_ohlcv_ir.js",
      instances: "1",
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "train_ccxt_ohlcv",
      script: "train_ccxt_ohlcv.js",
      instances: "1",
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "train_ohlcv",
      script: "train_ohlcv.js",
      instances: "1",
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "label_ohlcv",
      script: "label_ohlcv.js",
      instances: "1",
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "label_ohlcv_multi",
      script: "label_ohlcv_multi.js",
      instances: "1",
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
