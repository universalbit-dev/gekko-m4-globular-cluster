/*

  Gekko is a Bitcoin trading bot for popular Bitcoin exchanges written 
  in node, it features multiple trading methods using technical analysis.

  If you are interested in how Gekko works, read more about Gekko's 
  architecture here:

  https://github.com/askmike/gekko/blob/stable/docs/internals/architecture.md

  Disclaimer:

  USE AT YOUR OWN RISK!

  The author of this project is NOT responsible for any damage or loss caused 
  by this software. There can be bugs and the bot may not perform as expected 
  or specified. Please consider testing it first with paper trading and/or 
  backtesting on historical data. Also look at the code to see what how 
  it is working.

*/

var start = (mode, config) => {
  var util = require(__dirname + '/../../util');

  // force correct gekko env
  util.setGekkoEnv('child-process');

  var dirs = util.dirs();

  // force correct gekko mode & config
  util.setGekkoMode(mode);
  util.setConfig(config);

  var pipeline = require(dirs.core + 'pipeline');
  pipeline({
    config: config,
    mode: mode
  });
}

process.send('ready');

process.on('message', function(m) {
  if(m.what === 'start')
    start(m.mode, m.config);

  if(m.what === 'exit')
    process.exit(0);
});

process.on('disconnect', function() {
  console.log('disconnect');
  process.exit(-1);
})

process
  .on('unhandledRejection', (message, p) => {
    console.error('unhandledRejection', message);
    process.send({type: 'error', message: message});
  })
  .on('uncaughtException', err => {
    console.error('uncaughtException', err);
    process.send({type: 'error', error: err});
    process.exit(1);
  });

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
