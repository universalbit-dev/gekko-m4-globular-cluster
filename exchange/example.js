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
