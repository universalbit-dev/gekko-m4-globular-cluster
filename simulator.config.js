module.exports = {
  apps : [
  {
  name: 'neuralnet_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_neuralnet_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'cci_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_cci_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'dema_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_dema_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'rsibullbearadx_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_rsibullbearadx_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'noop_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_noop_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  }
]
}
