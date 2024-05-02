module.exports = {
  apps : [{
    name: "inverter",
    script    : 'gekko.js',
    args      : '-c ecosystem/import/import.js -i',
    name      : '|- import exchange data -|',
    instances : "1",
    autorestart: false,
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  }

]}
