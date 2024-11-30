#### The [CCXT](https://www.npmjs.com/package/ccxt) library is used to connect and trade with cryptocurrency exchanges and payment processing services worldwide.

```bash
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
```
* [CCXT Wrappers](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/exchange/wrappers/ccxt) --

---
* [CCXT Examples](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/examples/ccxt%20examples)
* [Wiki Manual](https://github.com/ccxt/ccxt/wiki/manual)
* [Legality_of_cryptocurrency_by_country](https://en.wikipedia.org/wiki/Legality_of_cryptocurrency_by_country_or_territory)
* [NodeJS Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)


