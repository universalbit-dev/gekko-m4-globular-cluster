module.exports = {
  apps: [
    {
      name: "autoTune",
      script: "autoTune.js",
      instances: 1,
      exec_mode: "cluster",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "evaluate",
      script: "evaluate.js",
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
