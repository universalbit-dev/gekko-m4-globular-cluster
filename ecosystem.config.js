module.exports = {
  apps : [
  {script: 'node gekko -c ecosystem/backtest/backtest_nnstoch.js -b'},
  {script: 'node gekko -c ecosystem/backtest/backtest_nn.js -b'},
  {script: 'node gekko -c ecosystem/backtest/backtest_inverter.js -b'},
  {script: 'node gekko -c ecosystem/backtest/backtest_nncci.js -b'},
  {script: 'node gekko -c ecosystem/backtest/backtest_stochrsi.js -b'}
],
  
  deploy : {
    development : {
      user : '',
      host : '',
      ref  : 'origin/master',
      repo : 'https://github.com/universalbit-dev/gekko-m4',
      path : '',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env development',
      'pre-setup': ''
    }
  }
};
