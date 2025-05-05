/* copilot explain
The provided code defines a TradeBatcher class used for processing and batching trade data. Here's a detailed explanation of its components:
Imports and Initial Setup

    Various modules are imported, including underscore for utility functions, EventEmitter for event handling, moment for date manipulation, util and log for utility and logging functions, nanospinner for creating spinners, and mathjs for mathematical operations.

TradeBatcher Class:

    Constructor: Initializes the TradeBatcher instance with a trade ID (tid). If tid is not a string, an error is thrown. Functions are bound to the instance using underscore.
    write(batch): Processes a batch of trades. If the batch is not an array or is empty, appropriate actions are taken (error thrown or debug message logged). 
    The batch is filtered and converted to moment dates. 
    A spinner is created to indicate processing. The method emits a new batch event with the processed trade data.
    filter(batch): Filters out trades with zero amounts and trades that have already been processed based on the last trade ID (tid).
    convertDates(batch): Converts the trade dates to moment.js UTC dates.

Event Handling:
    The class extends EventEmitter to emit events, allowing other components to listen and react to new trade batches.
*/

const _ = require("underscore");
const { EventEmitter } = require("events");
var moment = require("moment");
var util = require('../util.js');var config = util.getConfig();
var log = require('../log.js');
const { createSpinner } =require('nanospinner');
var math=require('mathjs');

var TradeBatcher = function(tid) {
  EventEmitter.call(this);
  if(!_.isString(tid))
    throw new Error('tid is not a string');
  _.bindAll(this,_.functions(this));
  this.tid = tid;
  this.last = -1;
}
util.makeEventEmitter(TradeBatcher);

TradeBatcher.prototype.write = function(batch) {
  if(!_.isArray(batch))
    throw new Error('batch is not an array');

  if(_.isEmpty(batch))
    return log.debug('Trade fetch came back empty.');

  log.debug('Incoming batch:', batch);
  var filterBatch = this.filter(batch);
  var amount = _.size(filterBatch);
  //log.debug('Filtered batch:', filterBatch);

  if(!amount)return; 
  var momentBatch = this.convertDates(filterBatch);
  //log.debug('Converted dates batch:', momentBatch);

  var min=4000;var max=10000;
  var last = _.last(momentBatch);
  var first = _.first(momentBatch);
  const spinner = createSpinner(
  'Processing Exchange Data: ' + moment().format('YYYY-MM-DD HH:mm:ss')
).start();
  setTimeout(() => {spinner.success()}, math.random(min,max));
  spinner.update({text: 'Processed',color: 'yellow',stream: process.stdout,
  frames:['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>','...'],
  interval: math.random(min,max),});

  this.emit('new batch', {
    amount: amount,
    start: moment().format('YYYY-MM-DD HH:mm:ss Z'),
    end: last.date,
    last: last,
    first: first,
    data: momentBatch
  });

  this.last = last[this.tid];

// we overwrote those, get unix ts back
  if(this.tid === 'date')
    this.last = this.last.unix();

}

TradeBatcher.prototype.filter = function(batch) {
  // make sure we're not trying to count
  // beyond infinity
  var lastTid = _.last(batch)[this.tid];
  if(lastTid === lastTid + 1)
    util.die('trade tid is max int, Gekko can\'t process..');

// remove trades that have zero amount
  batch = _.filter(batch, function(trade) {return trade.amount > 0;});
  return _.filter(batch, function(trade) {return this.last < trade[this.tid];},this);
}

TradeBatcher.prototype.convertDates = function(batch) {
  return _.map(_.clone(batch), function(trade) {
    trade.date = moment.unix(trade.date).utc();
    return trade;
  });
}
module.exports = TradeBatcher;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
