//async fetch currencies - advanced error handling -
"use strict";
const ccxt = require ('ccxt');
async function exchange_kraken() {
    let exchange = new ccxt.kraken ({apiKey: 'YOUR_PUBLIC_API_KEY',secret: 'YOUR_SECRET_PRIVATE_KEY',})
    console.log (exchange.id,await exchange.fetchCurrencies())
}
    
async function fetch_currencies(){
    try {
        let markets = await exchange_kraken();
        console.log(exchange_kraken.id);
    } catch (e) {
        if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {console.log ('[DDoS Protection] ' + e.message);} 
        else if (e instanceof ccxt.RequestTimeout) {console.log ('[Request Timeout] ' + e.message);} 
        else if (e instanceof ccxt.AuthenticationError) {console.log ('[Authentication Error] ' + e.message);} 
        else if (e instanceof ccxt.ExchangeNotAvailable) {console.log ('[Exchange Not Available Error] ' + e.message);} 
        else if (e instanceof ccxt.ExchangeError) {console.log ('[Exchange Error] ' + e.message);} else if (e instanceof ccxt.NetworkError) {console.log ('[Network Error] ' + e.message);} 
        else {throw e;}
    }
}

fetch_currencies();
