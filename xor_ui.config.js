module.exports = {
  apps : [{
    name: "xor_ui",
    script    : 'server.js',
    name      : '|- xor user interface -|',
    instances : "1",
    autorestart: true,
    exec_mode : "cluster",
    env: {NODE_ENV: "development",},
    env_production: {NODE_ENV: "production",}
  }

]}
