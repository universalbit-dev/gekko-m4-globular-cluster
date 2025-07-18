module.exports = {
  apps: [
    {
      name: 'ccxtmarket',
      script: 'ccxtMarketData.js',
      instances: '1',
      exec_mode: 'cluster',
    }
  ]
};
