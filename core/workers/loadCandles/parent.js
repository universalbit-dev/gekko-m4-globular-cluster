const fork = require('child_process').fork;
const { EventEmitter } = require("events");
const _ = require("underscore");

var start = (config, candleSize, daterange) => {
  var util = require(__dirname + '/../../util');
  util.setGekkoEnv('child-process');
  config.debug = false;
  util.setConfig(config);

  var dirs = util.dirs();
  var load = require(dirs.tools + 'candleLoader');
  load(config.candleSize, candles => { this.send(candles); });
}

module.exports = (config, callback) => {
  var debug = typeof v8debug === 'object';
  if (debug) { process.execArgv = []; }

  const child = fork(__dirname + '/child');
  const message = { what: 'start', config }
  const done = _.once(callback);
  this.on('message', function (m) {
    if (m === 'ready') return this.send(message);
    done(null, m);
    if (this.connected) { this.disconnect(); }
  });
  this.on('exit', code => { if (code !== 0) done('ERROR, unable to load candles, please check the console.'); });

  this.send('ready');
  this.on('message', (m) => {
    if (m.what === 'start') start(m.config, m.candleSize, m.daterange);
  });
  this.on('disconnect', function () { process.exit(0); });
}

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
