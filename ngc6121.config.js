module.exports = {
  apps : [
  {
  name: "pm2-cpu-watchdog",
  script    : "pm2-cpu-watchdog.js",
  instances : "1",
  exec_mode : "cluster",
  },
  {
  name: 'pm2-tools-watchdog',
  script    : 'tools/pm2-tools-watchdog.js',
  instances : "1",
  exec_mode : "cluster"
  }
]
}
