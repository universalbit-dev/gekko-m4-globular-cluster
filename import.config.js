module.exports = {
  apps : [{
    name: "import",
    script    : 'gekko.js',
    args      : '-c env/import/import.js -i',
    instances : "1",
    autorestart: false,
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  }

]}
