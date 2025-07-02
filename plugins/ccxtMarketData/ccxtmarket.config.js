module.exports = {
  apps: [
    {
      name: 'ccxtmarket',
      script: 'ccxtMarketData.js',
      instances: 'max',
      exec_mode: 'cluster',
    }
  ]
};
