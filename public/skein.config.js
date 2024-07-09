module.exports = {
  apps : [{
    name: "skein",
    script    : 'unbt_skein.js',
    restart_delay: 3000,
    args      : '',
    name      : '|UNBT|-Skein-|',
    instances : "1",
    autorestart: true,
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}

  }

]}
