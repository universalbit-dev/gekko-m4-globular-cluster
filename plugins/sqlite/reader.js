const _ = require("underscore");
var fs = require("fs-extra");

var util = require('../../core/util.js');
var config = util.getConfig();
var log = require(util.dirs().core + 'log');

var sqlite = require('./handle');
var sqliteUtil = require('./util');

var Reader = function() {
  _.bindAll(this,_.functions(this));
  this.db = sqlite.initDB(true);
}


// returns the most recent window complete candle
// windows within `from` and `to`
Reader.prototype.mostRecentWindow = function(from, to, next) {
  to = to.unix();from = from.unix();
  var maxAmount = to - from + 1;
  this.db.all(`
    SELECT start from ${sqliteUtil.table('candles')}
    WHERE start <= ${to} AND start >= ${from}
    ORDER BY start DESC
  `, function(err, rows) {
    if(err) {

      // bail out if the table does not exist
      if(err.message.split(':')[1] === ' no such table')
        return next(false);

      log.error(err);
      return util.die('DB error while reading mostRecentWindow');
    }

    // no candles are available
    if(rows.length === 0) {
      return next(false);
    }

    if(rows.length === maxAmount) {

      // full history is available!

      return next({
        from: from,
        to: to
      });
    }

    // we have at least one gap, figure out where
    var mostRecent = _.first(rows).start;

    var gapIndex = _.findIndex(rows, function(r, i) {
      return r.start !== mostRecent - i * 60;
    });

    // if there was no gap in the records, but
    // there were not enough records.
    if(gapIndex === -1) {
      var leastRecent = _.last(rows).start;
      return next({
        from: leastRecent,
        to: mostRecent
      });
    }

    // else return mostRecent and the
    // the minute before the gap
    return next({
      from: rows[ gapIndex - 1 ].start,
      to: mostRecent
    });

  })
}

Reader.prototype.tableExists = function(name, next) {

  this.db.all(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='${sqliteUtil.table(name)}';
  `, function(err, rows) {
    if(err) {
      console.error(err);
      return util.die('DB error at `get`');
    }

    next(null, rows.length === 1);
  });
}

Reader.prototype.get = function(from, to, what, next) {
  if(what === 'full')
    what = '*';

  this.db.all(`
    SELECT ${what} from ${sqliteUtil.table('candles')}
    WHERE start <= ${to} AND start >= ${from}
    ORDER BY start ASC
  `, function(err, rows) {
    if(err) {
      console.error(err);
      return util.die('DB error at `get`');
    }

    next(null, rows);
  });
}

Reader.prototype.count = function(from, to, next) {
  this.db.all(`
    SELECT COUNT(*) as count from ${sqliteUtil.table('candles')}
    WHERE start <= ${to} AND start >= ${from}
  `, function(err, res) {
    if(err) {
      console.error(err);
      return util.die('DB error at `get`');
    }

    next(null, _.first(res).count);
  });
}

Reader.prototype.countTotal = function(next) {
  this.db.all(`
    SELECT COUNT(*) as count from ${sqliteUtil.table('candles')}
  `, function(err, res) {
    if(err) {
      console.error(err);
      return util.die('DB error at `get`');
    }

    next(null, _.first(res).count);
  });
}

Reader.prototype.getBoundry = function(next) {

  this.db.all(`
    SELECT
    (
      SELECT start
      FROM ${sqliteUtil.table('candles')}
      ORDER BY start LIMIT 1
    ) as 'first',
    (
      SELECT start
      FROM ${sqliteUtil.table('candles')}
      ORDER BY start DESC
      LIMIT 1
    ) as 'last'
  `, function(err, rows) {
    if(err) {
      console.error(err);
      return util.die('DB error at `get`');
    }

    next(null, _.first(rows));
  });
}

Reader.prototype.close = function() {
  this.db.close();
  this.db = null;
}

module.exports = Reader;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
