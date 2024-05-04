module.exports = {
  apps : [{
    name: 'noop',
    script    : 'gekko.js',
    args      : '-c ecosystem/trade/trade_noop.js',
    name      : '|NOOP|-realtime-|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  }]
}
