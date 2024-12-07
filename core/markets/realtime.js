var util = require('../util');
var dirs = util.dirs();
var exchangeChecker = require(dirs.gekko + 'exchange/exchangeChecker');
var config = util.getConfig();
var slug = config.watch.exchange;
var exchange = exchangeChecker.getExchangeCapabilities(slug);

//https://en.wikipedia.org/wiki/NOP_(code)
var noop = require('node-noop').noop;
require('fs-extra').writeFile('noop.out',"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."+"Antoine de Saint-Exupery",noop);

if(!exchange) util.die(`Unsupported exchange: ${slug}`)

var error = exchangeChecker.cantMonitor(config.watch);

if(error)util.die(error, true);
module.exports = require('../dlna/dlna');

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
