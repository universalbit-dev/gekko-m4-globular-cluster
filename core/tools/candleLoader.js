//https://en.wikipedia.org/wiki/Candlestick_chart
const batchSize = 1000;

const _ = require("underscore");
const fs = require('fs-extra');
const moment = require('moment');
const { EventEmitter } = require("events");
const util = require('../core/util');
const dirs = util.dirs();
const config = util.getConfig();

const log = require(dirs.core + '/log');

const adapter = config[config.adapter];
const Reader = require(dirs.gekko + adapter.path + '/reader');
const daterange = config.daterange;

const CandleBatcher = require(dirs.core + 'candleBatcher');

const to = moment.utc(daterange.to).startOf('minute');
const from = moment.utc(daterange.from).startOf('minute');
const toUnix = to.unix();

if (to <= from) {
  util.die('This daterange does not make sense. `to` date must be after `from` date.');
}

if (!from.isValid()) {
  util.die('Invalid `from` date.');
}

if (!to.isValid()) {
  util.die('Invalid `to` date.');
}

let iterator = {
  from: from.clone(),
  to: from.clone().add(batchSize, 'm').subtract(1, 's')
}

let DONE = false;

let result = [];
let reader = new Reader();
let batcher;
let next;
const doneFn = () => {
  process.nextTick(() => {
    next(result);
  });
};

module.exports = function(candleSize, _next) {
  next = _.once(_next);

  batcher = new CandleBatcher(candleSize)
    .on('candle', handleBatchedCandles);

  getBatch();
}

const getBatch = () => {
  reader.get(
    iterator.from.unix(),
    iterator.to.unix(),
    'full',
    handleCandles
  ).catch(err => {
    console.error('Failed to get batch:', err);
    util.die('Failed to get batch.');
  });
}

const shiftIterator = () => {
  iterator = {
    from: iterator.from.clone().add(batchSize, 'm'),
    to: iterator.from.clone().add(batchSize * 2, 'm').subtract(1, 's')
  }
}

const handleCandles = (err, data) => {
  if (err) {
    console.error('Error handling candles:', err);
    util.die('Encountered an error while handling candles.');
  }

  if (_.size(data) && _.last(data).start >= toUnix || iterator.from.unix() >= toUnix)
    DONE = true;

  batcher.write(data);
  batcher.flush();

  if (DONE) {
    reader.close();

    setTimeout(doneFn, 100);

  } else {
    shiftIterator();
    getBatch();
  }
}

const handleBatchedCandles = candle => {
  result.push(candle);
}
▋
/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
