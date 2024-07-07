const _ = require('../../core/lodash3');require('lodash-migrate');
var util = require('../../core/util');
var log = require('../../core/log');
var config = util.getConfig();
const {EventEmitter} = require('node:events');

const fs = require('node:fs');
const async=require('async');
async.map(['handle.js','reader.js','scanner.js','util.js','writer.js'], fs.stat, function(err, results){_.noop;});

const sqlite3 = require('sqlite3').verbose();
var db;exports.db = db;

var sqlite = require('./handle');
var sqliteUtil = require('./util');
//SQLite on Node.js with async/await
exports.run=function(query, params) {
    return new Promise(function(resolve, reject) {
        if(params == undefined) params=[]
        this.db.all(query, params, function(err, rows)  {
            if(err) reject("Read error: " + err.message)
            else {resolve(rows)}
        })
    }) 
}

var Store = function(done, pluginMeta) {
  _.bindAll(this,_.functions(this));
  this.done = done
  this.db = sqlite.initDB(false);
  this.db.serialize(this.upsertTables);
  this.cache = [];
  this.buffered = util.gekkoMode() === "importer";
}
util.makeEventEmitter(Store);

Store.prototype.upsertTables = function() {
  var createQueries = [
    `
      CREATE TABLE IF NOT EXISTS
      ${sqliteUtil.table('candles')} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start INTEGER UNIQUE,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        vwp REAL NOT NULL,
        volume REAL NOT NULL,
        trades INTEGER NOT NULL
      );
    `,
  ];

  var next = _.after(_.size(createQueries), this.done);

  _.each(createQueries, function(q) {
    this.db.run(q, next);
  }, this);
}

Store.prototype.writeCandles = function() {
  if(_.isEmpty(this.cache))
    return;

  const transaction = () => {
    this.db.run("BEGIN TRANSACTION");

    var stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${sqliteUtil.table('candles')}
      VALUES (?,?,?,?,?,?,?,?,?)
    `, function(err, rows) {
        if(err) {
          log.error(err);
          return util.die('DB error at INSERT: '+ err);
        }
      });

    _.each(this.cache, candle => {
      stmt.run(
        null,
        candle.start.unix(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.vwp,
        candle.volume,
        candle.trades
      );
    });
    stmt.finalize();
    this.db.run("COMMIT");
    this.db.run("pragma wal_checkpoint;");
    this.cache = [];
  }
  this.db.serialize(transaction);
}
var processCandle = function(candle, done) {
  this.cache.push(candle);
  if (!this.buffered || this.cache.length > 1000)
    this.writeCandles();

  done();
};

var finalize = function(done) {
  this.writeCandles();
  this.db.close(() => { done(); });
  this.db = null;
}

if(config.candleWriter.enabled) {
  Store.prototype.processCandle = processCandle;
  Store.prototype.finalize = finalize;
}

module.exports = Store;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
