/* Decentralized Strategies: {CCXT Library} Create Market Buy/Sell Orders 
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
    |       fetchMarkets           .      ===> createOrder <===   |
    |       fetchCurrencies        .            cancelOrder       |
    |       fetchTicker            .             fetchOrder       |
    |       fetchTickers           .            fetchOrders       |
    |       fetchOrderBook         .        fetchOpenOrders       |
    |       fetchOHLCV             .      fetchClosedOrders       |
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
    +=============================================================+
*/
var Promise = require("bluebird");const ccxt = Promise.promisifyAll(require("ccxt"));

//Javascript Examples https://docs.ccxt.com/#/examples/js/
const symbol = 'LTC/BTC';
var type = 'market';  
var side = 'sell';     
var amount = 0.01;          
var price = 1;      
var params = {};         
var id = ''; /* Exchange Name */
/* Supported Exchanges : https://github.com/ccxt/ccxt/wiki/Exchange-Markets */

//Market Sell Order.Private HTTP REST APIs (apiKey:secret required)
var exchange = new ccxt[id] ({
        verbose: false,
        apiKey: '',/* */
        secret: '',/* */
    });

const sell = async function() {
    try {
    side='sell';
    const orders = await exchange.createOrder(symbol,type,side,amount);
    return console.log ('Submitted Sell Order -- Wohoo! -- ',orders);
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message)
     return console.log ('Submit Sell Order -- Error -- ');
    }
};return sell();


module.exports={sell};

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


