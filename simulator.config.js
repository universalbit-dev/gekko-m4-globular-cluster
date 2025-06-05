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
    name: "grafana_neuralnet",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9560,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/neuralnet.json"
    }
  },
  {
  name: 'cci_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_cci_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
    name: "grafana_cci",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9561,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/cci.json"
    }
  },
  {
  name: 'dema_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_dema_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
    name: "grafana_dema",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9562,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/dema.json"
    }
  },
  {
  name : 'rsibullbearadx_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_rsibullbearadx_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
    name: "grafana_rsibullbearadx",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9563,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/rsibullbearadx.json"
    }
  },
  {
  name: 'bollingerband_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_bollingerband_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
    name: "grafana_bollingerband",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9564,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/bollingerband.json"
    }
  },
  {
  name: 'noop_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_noop_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
    name: "grafana_noop",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9565,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/noop.json"
    }
  },
  {
  name: 'neuralnet_refinements_simulator',
  script    : 'gekko.js',
  args      : '-c env/simulator/trade_neuralnet_simulator.js',
  instances : "1",
  exec_mode : "cluster"
  },
  {
    name: "grafana_neuralnet_refinements",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/json",
      PM2_SERVE_PORT: 9566,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/json/neuralnet_refinements.json"
    }
  },
  {
     name: "csvexport",
     script    : 'gekko.js',
     args      : '-c env/simulator/trade_csvexport.js',
     instances : "1",
     exec_mode : "cluster"
  },
  {
    name: "ohlcv_data",
    script: "serve",
    env: {
      PM2_SERVE_PATH: "./logs/csv",
      PM2_SERVE_PORT: 9567,
      PM2_SERVE_SPA: true,
      PM2_SERVE_HOMEPAGE: "./logs/csv/ohlcv_data.csv"
    }
  },
  {
    name: "pm2-cpu-watchdog",
    script: "./pm2-cpu-watchdog.js",
    watch: false
  },
]
}
