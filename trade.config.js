module.exports = {
  apps : [
  {
  name: 'neuralnetv2',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_neuralnetv2_simulator.js',
  name      : '|NEURALNETV2|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'noop',
  script    : 'gekko.js',
  args      : '-c .env/trade/trade_noop_simulator.js',
  name      : '|NOOP|-simulator-|',
  instances : "1",
  exec_mode : "cluster"
  }

]

}
