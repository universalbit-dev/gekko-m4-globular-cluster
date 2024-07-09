module.exports = {
  apps : [{
    name: "skein",
    script    : 'unbt_skein.js',
    cron_restart: '5 0 * * *',
    args      : '',
    name      : '|UNBT|-Skein-|',
    instances : "1",
    autorestart: true,
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}

  }

]}
