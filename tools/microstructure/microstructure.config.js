module.exports = {
  apps: [
    {
      name: "aggregator",
      script: "aggregator.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "featureExtractor",
      script: "featureExtractor.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "micro_ccxt_orders",
      script: "micro_ccxt_orders.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "microSignalLogger",
      script: "microSignalLogger.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "microOHLCV",
      script: "microOHLCV.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "trainer_tf",
      script: "trainer_tf.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "index",
      script: "index.js",
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
