
# Dlna
Dlna is a small part of Gekko's core that aggregates realtime market data from any supported exchange into a readable stream of candles. Example usage:
```
    var config = {
        exchange: 'exchangesimulator',
        currency: 'BTC',
        asset: 'LTC'
    }

    new Dlna(config)
      .start()
      // convert JS objects to JSON string
      .pipe(new require('stringify-stream')())
      // output to standard out
      .pipe(process.stdout);
```
