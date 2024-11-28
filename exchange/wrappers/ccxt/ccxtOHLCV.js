/* Decentralized Strategies: {CCXT Library} Fetch OHLCV (Last 24hrs)
                                 User
    +-------------------------------------------------------------+
    |                            CCXT                             |
    +------------------------------+------------------------------+
    |            Public            |           Private            |
    +=============================================================+
    │                              .                              |
    │                    The Unified CCXT API                     |
    │                              .                              |
    |       loadMarkets            .           fetchBalance       |
    |       fetchMarkets           .            createOrder       |
    |       fetchCurrencies        .            cancelOrder       |
    |       fetchTicker            .             fetchOrder       |
    |       fetchTickers           .            fetchOrders       |
    |       fetchOrderBook         .        fetchOpenOrders       |
    |  ===> fetchOHLCV <===        .      fetchClosedOrders       |
    |       fetchStatus            .          fetchMyTrades       |
    |       fetchTrades            .                deposit       |
    |                              .               withdraw       |
    │                              .                              |
    +=============================================================+
    │                              .                              |
    |                     Custom Exchange API                     |
    |         (Derived Classes And Their Implicit Methods)        |
    │                              .                              |
    |       publicGet...           .          privateGet...       |
    |       publicPost...          .         privatePost...       |
    |                              .          privatePut...       |
    |                              .       privateDelete...       |
    |                              .                   sign       |
    │                              .                              |
    +=============================================================+
    │                              .                              |
    |                      Base Exchange Class                    |
    │                              .                              |
    +=============================================================+ */
var Promise = require("bluebird");const ccxt = Promise.promisifyAll(require("ccxt"));

//Javascript Examples https://docs.ccxt.com/#/examples/js/
const symbol = 'LTC/BTC'; /* */
var timeframe= '15m';     /* */   
var id = ''; /* Exchange Name */

return console.log('ccxt -- OHLCV');

/* Supported Exchanges : https://github.com/ccxt/ccxt/wiki/Exchange-Markets */

/*

//Available Exchanges
console.log (ccxt.exchanges) // print all available exchanges

//Fetch OHLCV .Public HTTP REST APIs(apiKey:secret not required)
var exchange = new ccxt[id] ({
        verbose: false,
        apiKey: '',  
        secret: '', 
    });

const ccxtohlcv=async function () {
while (true) {
    const fromTimestamp = exchange.milliseconds() - 86400 * 1000; //last 24 hrs
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe);
    const length = ohlcv.length;
    if (length > 0) {
    ccxt.exchanges
        console.log('Fetched ', length, ' candles',ohlcv[ohlcv.length - 1]);
    }
    else {console.log('No candles have been fetched');}
    };
};
return ccxtohlcv();

*/

module.exports={ccxtohlcv};

/* 
MIT License

Copyright © 2024 Igor Kroitor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. 
*/
