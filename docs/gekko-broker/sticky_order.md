# [Sticky Order](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/orders/sticky.js)

An advanced order that stays at the top of the book (until the optional limit). The order will automatically stick to the best until the complete amount has been filled.

- implement fallback for when this order is alone at the top, some spread before everyone else
- finalize API
- add more events / ways to debug
- pull ticker data out of this order market data should flow from the broker (so we can easier move to at least public websocket streams).

## Example usage
```js
const {EventEmitter}=require('events');
class Event extends EventEmitter{};order=new Event();

    var Broker=require("../../exchange/gekkoBroker.js");

    const wohoo = new Broker({
      currency: 'BTC',asset: 'LTC',exchange: 'wohoo',
      // Enables access to private endpoints,create orders and fetch portfolio
      private: true,
      key: 'APIKEY',secret: 'APISECRET',passphrase: 'APIPASSPHRASE'
    });

    wohoo.portfolio.setBalances(console.log);
    const type = 'sticky';const amount = 0.01;const side ='buy';const limit=92.00;//set price

    const order = wohoo.createOrder(type, side, amount, { limit });
    order.on('statusChange', status => console.log(status));
    order.on('filled', result => console.log(result));
    order.on('completed', () => {order.createSummary(summary => console.log)});

    //mutate like so
    //order.moveAmount(1);
    //order.moveLimit(6666);

```
