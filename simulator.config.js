module.exports = {
  apps : [
  {
  name: 'neuralnet_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_neuralnet_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: 'cci_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_cci_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: 'dema_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_dema_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name : 'rsibullbearadx_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_rsibullbearadx_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: 'bollingerband_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_bollingerband_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: 'noop_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_noop_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: 'neuralnet_refinements_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_neuralnet_simulator.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: "csvexport",
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_csvexport.js',
  instances : "max",
  exec_mode : "cluster",
  cron_restart: '*/45 * * * *',//45min
  autorestart: false
  },
  {
  name: "pm2-cpu-watchdog",
  script: "./pm2-cpu-watchdog.js",
  watch: false
  },
]
}
