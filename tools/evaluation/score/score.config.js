module.exports = {
  apps: [
    {
      name: "adx_score",
      script: "adx_score.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "atr_score",
      script: "atr_score.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "dx_score",
      script: "dx_score.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "rsi_score",
      script: "rsi_score.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "sma_score",
      script: "sma_score.js",
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
