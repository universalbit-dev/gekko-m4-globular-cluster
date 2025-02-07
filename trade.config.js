module.exports = {
  apps : [
  {
  name: 'neuralnet',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_neuralnet_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_noop_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  }
]

}
