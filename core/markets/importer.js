require('dotenv').config()
const _ = require('lodash');
const moment = require('moment');
const util = require('../util');
const config = util.getConfig();
const dirs = util.dirs();
const log = require(dirs.core + 'log');
const ccxt = require('ccxt');

const daterange = config.importer.daterange;
const since = moment.utc(daterange.from).valueOf(); // Convert to timestamp in milliseconds

if (!moment.utc(daterange.from).isValid())
    util.die('invalid `from`');

const to = daterange.to ? moment.utc(daterange.to).valueOf() : moment.utc().valueOf();

if (!moment.utc(daterange.to).isValid())
    util.die('invalid `to`');

if (to <= since)
    util.die('This daterange does not make sense.');

const TradeBatcher = require(dirs.dlna + 'tradeBatcher');
const CandleManager = require(dirs.dlna + 'candleManager');
const exchangeChecker = require(dirs.gekko + 'exchange/exchangeChecker');

const error = exchangeChecker.cantFetchFullHistory(config.watch);
if (error)
    util.die(error, true);

var id=config.watch.exchange;
class Fetcher {
    constructor(config) {
        this.exchange = new ccxt[id]({
            verbose: false,
            apiKey: process.env.key || config.watch.key,
            secret: process.env.secret || config.watch.secret,
        });
    }

    async getTrades(since, to, handleFetch) {
        try {
            let allTrades = [];
            let from = since;
            while (from < to) {
                const data = await this.exchange.fetchTrades(config.watch.currency + '/' + config.watch.asset, from);
                if (data.length === 0) break;
                allTrades = allTrades.concat(data);
                from = data[data.length - 1].timestamp + 1;
            }
            handleFetch(null, allTrades);
        } catch (err) {
            handleFetch(err, []);
        }
    }
}

util.makeEventEmitter(Fetcher);

class Market extends Readable {
    constructor() {
        super({ objectMode: true });
        _.bindAll(this, _.functions(this));
        this.exchangeSettings = exchangeChecker.settings(config.watch);

        this.tradeBatcher = new TradeBatcher(this.exchangeSettings.tid);
        this.candleManager = new CandleManager();
        this.fetcher = new Fetcher(config.watch);

        this.done = false;

        this.fetcher.on('trades', this.processTrades);
        this.fetcher.on('done', () => {
            this.done = true;
        });

        this.tradeBatcher.on('new batch', this.candleManager.processTrades);
        this.candleManager.on('candles', this.pushCandles);

        this.get(since, to);
    }

    _read() {
        // No-operation function required by the Readable stream
    }

    pushCandles(candles) {
        _.each(candles, this.push);
    }

    get(since, to) {
        this.fetcher.getTrades(since, to, this.handleFetch);
    }

    handleFetch(err, trades) {
        if (!err && !trades.length) {
            console.log('no trades');
            err = 'No trades';
        }

        if (err) {
            log.error(`There was an error importing from ${config.watch.exchange}: ${err}`);
            this.fetcher.emit('done');
            return this.fetcher.emit('trades', []);
        }

        this.fetcher.emit('trades', trades);
    }

    processTrades(trades) {
        this.tradeBatcher.write(trades);

        if (this.done) {
            log.info('Done importing!');
            this.emit('end');
            return;
        }

        if (_.size(trades)) {
            const lastAtTS = _.last(trades).timestamp;
            const lastAt = moment.utc(lastAtTS).format();
            process.send({ event: 'marketUpdate', payload: lastAt });
        }

        setTimeout(() => this.get(_.last(trades).timestamp, to), 1000);
    }
}

module.exports = Market;
