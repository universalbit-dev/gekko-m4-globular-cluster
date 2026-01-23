const _ = require("underscore");
var fs = require("fs-extra");

var util = require('../../core/util.js');var config = util.getConfig();var dirs = util.dirs();

var adapter = config.sqlite;
// verify the correct dependencies are installed
var pluginHelper = require(dirs.core + 'pluginUtil');
var pluginMock = {slug: 'sqlite3'};

var cannotLoad = pluginHelper.cannotLoad(pluginMock);
if (cannotLoad) util.die(cannotLoad);

// should be good now
if (config.debug) var sqlite3 = require('sqlite3').verbose();
else var sqlite3 = require('sqlite3');

var plugins = require(util.dirs().gekko + 'plugins');

var version = adapter.version;

var dbName = config.watch.exchange.toLowerCase() + '_' + version + '.db';
var dir = dirs.gekko + adapter.dataDirectory;

var fullPath = [dir, dbName].join('/');

var mode = util.gekkoMode();
if (mode === 'realtime' || mode === 'importer') {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
} else if (mode === 'backtest') {
  if (!fs.existsSync(dir)) util.die('History directory does not exist.');

  if (!fs.existsSync(fullPath))
    util.die(
      `History database does not exist for exchange ${
        config.watch.exchange
      } at version ${version}.`
    );
}

module.exports = {
  initDB: () => {
    var journalMode = adapter.journalMode || 'WAL';
    var syncMode = adapter.syncMode || 'NORMAL';
  
    var db = new sqlite3.Database(fullPath);

    // Configure busy timeout immediately so subsequent statements wait for locks.
    try {
      if (typeof db.configure === 'function') {
        db.configure('busyTimeout', 10000);
      } else {
        // Fallback: set via PRAGMA if configure() is not available.
        db.run("PRAGMA busy_timeout = 10000", function(err) {
          if (err) console.warn('PRAGMA busy_timeout failed:', err);
        });
      }
    } catch (e) {
      console.warn('Could not set busy timeout via configure/pragmas', e);
    }

    // Helper to run PRAGMA statements with limited retries on SQLITE_BUSY.
    function runPragmaWithRetry(sql, cb, attempt = 1) {
      db.run(sql, function(err) {
        if (err && err.code === 'SQLITE_BUSY' && attempt < 6) {
          // exponential backoff: 200ms, 400ms, 800ms...
          var backoff = 200 * Math.pow(2, attempt - 1);
          setTimeout(() => runPragmaWithRetry(sql, cb, attempt + 1), backoff);
          return;
        }
        if (err) console.error(sql + ' error:', err);
        if (typeof cb === 'function') cb(err);
      });
    }

    // Serialize PRAGMA execution so ordering is consistent.
    db.serialize(() => {
      runPragmaWithRetry('PRAGMA synchronous = ' + syncMode);
      runPragmaWithRetry('PRAGMA journal_mode = ' + journalMode);
    });

    return db;
  }
};

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
