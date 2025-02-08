/*  copilot explain
This file, importer.js, is part of the universalbit-dev/gekko-m4-globular-cluster repository. It handles importing trade data from cryptocurrency exchanges using the ccxt library. Here is a breakdown of its components:

    Imports and Initial Setup:
        The script imports various libraries and utilities, including lodash, moment, util, ccxt, and custom modules like TradeBatcher, CandleManager, and exchangeChecker.

    Date Range Validation:
        It validates the date range specified in the configuration. If the date range is invalid, it exits the script with an error message.

    Fetcher Class:
        This class initializes an exchange instance using the ccxt library with API keys and secrets.
        The getTrades method fetches trades from the exchange within a specified limit and date range.

    Market Class:
        This class extends Readable and integrates the Fetcher, TradeBatcher, and CandleManager.

    Market Constructor:
        Binds functions to the context.
        Initializes the trade batcher, candle manager, and fetcher.
        Sets up event listeners for fetching and processing trades.
        Starts fetching trades by calling get().

    Event Handling:
        _read: A no-operation function required by the Readable stream.
        pushCandles: Pushes candle data to the stream.
        get: Fetches trades from the exchange.
        handleFetch: Handles fetched trades, processes errors, and manages date ranges.
        processTrades: Processes and batches trades, sends updates, and manages completion.

In summary, this script sets up a system to fetch, process, and manage trade data from cryptocurrency exchanges using the ccxt library. 
The data is batched and converted into candles for further analysis or usage.
*/

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

class Fetcher {
    constructor(config) {
        this.exchange = new ccxt[config.watch.exchange]({
            verbose: false,
            apiKey: process.env.API_KEY || config.watch.key,
            secret: process.env.API_SECRET || config.watch.secret,
        });
    }

    async getTrades(since, limit, handleFetch) {
        try {
            const trades = await this.exchange.fetchTrades(config.watch.currency + '/' + config.watch.asset, since, { limit: limit });
            handleFetch(null, trades);
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

        this.get(since);
    }

    _read() {
        // No-operation function required by the Readable stream
    }

    pushCandles(candles) {
        _.each(candles, this.push);
    }

    get(since) {
        this.fetcher.getTrades(since, 500, this.handleFetch);
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

        const last = _.last(trades).timestamp;
        const lastId = last;

        if (last < since) {
            log.debug('Skipping data, they are before from date', moment.utc(last).format());
            return this.get(since);
        }

        if (last > to || lastId === prevLastId) {
            this.fetcher.emit('done');
            const endUnix = to;
            trades = _.filter(trades, t => t.timestamp <= endUnix);
        }

        prevLastId = lastId;
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

        setTimeout(() => this.get(_.last(trades).timestamp), 1000);
    }
}

module.exports = Market;


/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
