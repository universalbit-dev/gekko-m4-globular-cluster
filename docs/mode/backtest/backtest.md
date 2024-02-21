<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

};

config.backtestResultExporter = {
  enabled: true,
  writeToDisk: true,
  data: {
    stratUpdates: false,
    portfolioValues: true,
    stratCandles: false,
    roundtrips: true,
    trades: true
  }
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PAPERTRADER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.paperTrader = {enabled: true,
  reportInCurrency: true,
  simulationBalance: {asset: 100,currency: 1},
  feeMaker: 0.15,feeTaker: 0.25,feeUsing: 'maker',
  slippage: 0.05
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PERFORMANCE ANALYZER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.performanceAnalyzer = {enabled: true,riskFreeReturn: 5};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING IMPORTER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.importer = {
  enabled:false,
  daterange:{from:"2021-01-01",to:"2021-03-01"}
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING DB
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'4.1.2',dependencies:[{module: 'sqlite3',version:'5.1.4'}] };
config['I understand that Gekko only automates MY OWN trading strategies']=true;
module.exports = config;
```
