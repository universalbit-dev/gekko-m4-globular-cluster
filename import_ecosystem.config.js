module.exports = {
  apps : [{
    name: "inverter",
    script    : 'gekko.js',
    args      : '-c ecosystem/import/import.js -i',
    name      : '|- import exchange data -|',
    instances : "1",
    cron_restart: '0 0 * * *',
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  }

]}
