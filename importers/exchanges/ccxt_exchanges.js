var _ = require('lodash');
var moment = require('moment');
var util = require('../../core/util.js');
var log = require('../../core/log');
var config = util.getConfig();
var dirs = util.dirs();
var ccxt = require('ccxt');

var Fetcher = function(config) {
    this.exchange = new ccxt[config.watch.exchange]({
        apiKey: config.watch.key,
        secret: config.watch.secret,
    });
    util.makeEventEmitter(this);
};

Fetcher.prototype.getTrades = async function(since, handleFetch) {
    try {
        const trades = await this.exchange.fetchTrades(config.watch.currency + '/' + config.watch.asset, since, { limit: 500 });
        handleFetch(null, trades);
    } catch (err) {
        handleFetch(err, []);
    }
};

util.makeEventEmitter(Fetcher);

var end = false;
var done = false;
var from = false;
var lastId = false;
var prevLastId = false;

var fetcher = new Fetcher(config.watch);

var fetch = () => {
    fetcher.import = true;

    if (lastId) {
        var tidAsTimestamp = lastId;
        setTimeout(() => {
            fetcher.getTrades(tidAsTimestamp, handleFetch)
        }, 500);
    } else {
        fetcher.getTrades(from, handleFetch);
    }
};

var handleFetch = (err, trades) => {
    if (!err && !trades.length) {
        console.log('no trades');
        err = 'No trades';
    }

    if (err) {
        log.error(`There was an error importing from ${config.watch.exchange}: ${err}`);
        fetcher.emit('done');
        return fetcher.emit('trades', []);
    }

    var last = moment.unix(_.last(trades).timestamp / 1000).utc();
    lastId = _.last(trades).timestamp;

    if (last < from) {
        log.debug('Skipping data, they are before from date', last.format());
        return fetch();
    }

    if (last > end || lastId === prevLastId) {
        fetcher.emit('done');
        var endUnix = end.unix();
        trades = _.filter(trades, t => t.timestamp / 1000 <= endUnix);
    }

    prevLastId = lastId;
    fetcher.emit('trades', trades);
};

module.exports = function(daterange) {
    from = daterange.from.clone();
    end = daterange.to.clone();

    return {
        bus: fetcher,
        fetch: fetch
    };
};
