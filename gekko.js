/*
  Disclaimer:
  USE AT YOUR OWN RISK!

  The author of this project is NOT responsible for any damage or loss caused 
  by this software. There can be bugs and the bot may not perform as expected 
  or specified. Please consider testing it first with paper trading and/or 
  backtesting on historical data. Also look at the code to see what how 
  it is working.
*/

console.log('=========================================');
console.log('UniversalBit Blockchain Powered by Gekko');
console.log('=========================================');
var util = require(__dirname + '/core/util.js');

console.log('\tGekko v' + util.getVersion());

var dirs = util.dirs();

//Remove if condition and enable multi-server files for running terminal one config file 
//realtime mode for each enabled exchange

if(util.launchUI()) {
  return require(util.dirs().web + 'server');
}

var pipeline = require(dirs.core + 'pipeline');
var config = util.getConfig();
var mode = util.gekkoMode();

pipeline({
  config: config,
  mode: mode
});

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
*/

