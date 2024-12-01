const _ = require("underscore");
var fs = require("fs-extra");
const {EventEmitter} = require("events");class Event extends EventEmitter{};
var config = require('../../core/util.js').getConfig();
var sqlite = require("./handle");
var sqliteUtil = require('./util');
var util = require('../../core/util');
var log = require('../../core/log');

var Store = function(done, pluginMeta) {
  _.bindAll(this,_.functions(this));
  this.done = done;

  this.db = sqlite.initDB(false);
  this.db.serialize(this.upsertTables);

  this.cache = [];
  this.buffered = util.gekkoMode() === "importer";
}
util.makeEventEmitter(Store);util.inherit(Store, EventEmitter);

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
