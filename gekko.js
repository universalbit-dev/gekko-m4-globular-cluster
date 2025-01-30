/*
  Disclaimer:
  USE AT YOUR OWN RISK!

  The author of this project is NOT responsible for any damage or loss caused
  by this software. There can be bugs and the bot may not perform as expected
  or specified. Please consider testing it first with paper trading and/or
  backtesting on historical data. Also look at the code to see what how
  it is working.
*/

/* COPILOT EXPLAIN
The gekko.js file is the main entry point for the Gekko application. Here is a brief explanation of its components:

    Lines 1-10: Disclaimer warning users about the potential risks of using the software.
    Lines 15-16: Importing required modules, including openvino-node and utility functions from ./core/util.
    Lines 17-20: Printing startup information to the console, including the version of Gekko.
    Lines 22-25: Importing and executing the pipeline with the current configuration and mode.
    Lines 29-35: MIT License information.
*/


const { addon: ov } = require('openvino-node');
const util = require('./core/util');const config = util.getConfig();const dirs = util.dirs();
console.log('##########################################');
console.log('UniversalBit Blockchain Powered by Gekko');
console.log('\tGekko v' + util.getVersion());
console.log('##########################################');

const pipeline = require("./core/pipeline.js");
const mode = util.gekkoMode();

pipeline({config: config,mode: mode});



/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
