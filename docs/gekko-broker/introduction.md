# Gekko Broker

Order execution library for bitcoin and crypto exchanges. This library is Gekko's execution engine for all live orders (simulated orders do not through Gekko Broker, they go through the paper trader). This library is intended for developers of trading systems in need for advanced order types on multiple exchanges over a unified API.

## Introduction

This library makes it easy to do (advanced) orders all crypto exchanges where Gekko can live trade at. 
* See the complete list [here](https://gekko.wizb.it/docs/introduction/supported_exchanges.html).

## Status
Simulated orders do not through Gekko Broker, they go through the [paper trader](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/paperTrader/paperTrader.js)

All communication is via the REST APIs of exchanges. Not all exchanges are supported.
## Order types

This library aims to offer advanced order types, even on exchanges that do not natively support them by tracking the market and supplementing native order support on specific exchanges.

Orders
- [Sticky Order](./sticky_order.md)
- [Base](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/orders/order.js) 
- [Limit](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/orders/limit.js) 
- [Market](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/orders/order.js)
- [TrailingStop](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/triggers/trailingStop.js)
- [Trigger](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/trigger.js) (stop but opposite direction)

### Example

Set up a Gekko Broker instance: 
* [exchange](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/exchange) directory

```js
const {EventEmitter}=require('events');
class Event extends EventEmitter{};
    const Broker = require('./gekkoBroker.js');
    const wohoo = new Broker({
      currency: 'BTC',asset: 'LTC',private: true,exchange: 'wohoo',key: 'APIKEY',secret: 'APISECRET' 
    });
```

Now we have an instance and can create a [sticky order](./sticky_order.md):
```js

    const type = 'sticky';const side = 'buy';const amount = 0.01;//set amount
    const order = wohoo.createOrder(type, side, amount);

    order.on('statusChange', s => console.log(now(), 'new status', s));
    order.on('fill', s => console.log(now(), 'filled', s));
    order.on('error', s => console.log(now(), 'error!', e));
    order.on('completed', a => {
      console.log(new Date, 'completed!');
      order.createSummary((err, s) => {
        console.log(new Date, 'summary:');
        console.log(JSON.stringify(s, null, 2));
      });
    });
```

This one doesn't have an upper limit price for what it will buy at. It will stick it's bid offer until it's filled. 
If you have a limit in mind you can specify it when creating, do this instead:
```js
    const order = wohoo.createOrder(type, side, amount, { limit: 100 });//set limit 
```

It will never offer to buy for more than 100, even if above 100 (the bid will end up deep in the book).

At any point in time you can change the limit (or the amount), for example:
```js
    order.moveLimit(120);
```

 
[example](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/example.js) file:
```js
const {EventEmitter}=require('events');
class Event extends EventEmitter{};
    const Broker = require('./gekkoBroker.js');
    const wohoo = new Broker({currency: 'BTC',asset: 'LTC',private: true,exchange: 'wohoo',key: 'APIKEY',secret: 'APISECRET' });
    const type = 'sticky';const side = 'buy';const amount = 0.01;//set amount
    const order = wohoo.createOrder(type, side, amount);
    order.on('statusChange', s => console.log(now(), 'new status', s));
    order.on('fill', s => console.log(now(), 'filled', s));
    order.on('error', s => console.log(now(), 'error!', e));
    order.on('completed', a => {console.log(new Date, 'completed!');
    order.createSummary((err, s) => {console.log(new Date, 'summary:');console.log(JSON.stringify(s, null, 2));});
    });
```
