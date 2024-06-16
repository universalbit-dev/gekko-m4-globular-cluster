module.exports = {
  apps : [{
    name: 'rsibullbearadx',
    script    : 'gekko.js',
    args      : '-c ecosystem/trade/trade_rsibullbearadx_simulator.js',
    name      : '|RSIBULLBEARADX|--simulator--|',
    instances : "1",
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  }]
}
