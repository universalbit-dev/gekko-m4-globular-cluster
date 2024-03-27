module.exports = {
  apps : [
  {script: 'node gekko -c ecosystem/backtest/NNSTOCH.js -b'},
  {script: 'node gekko -c ecosystem/backtest/NN.js -b'},
  {script: 'node gekko -c ecosystem/backtest/INVERTER.js -b'},
  {script: 'node gekko -c ecosystem/backtest/NNCCI.js -b'},
  {script: 'node gekko -c ecosystem/backtest/StochRSI.js -b'}
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
