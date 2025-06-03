# Plugins

A plugin is a low level module or plugin that can act upon events bubbling
through Gekko. If you want to have custom functionality so that your rocket
flies to the moon as soon as the price hits X you should create a plugin for it.

* **[baseTradingMethod](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/tradingAdvisor/baseTradingMethod.md)**
* **[asyncIndicatorRunner](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/tradingAdvisor/asyncIndicatorRunner.md)**
* **[paperTrader](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/paperTrader/paperTrader.md)**
* **[tradingAdvisor](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/tradingAdvisor/tradingAdvisor.md)**
* **[trader](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/trader/trader.md)**
* **[sqlite](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/sqlite/sqlite.md)**

## Implementing a new plugin

If you want to add your own plugin you need to expose a constructor function inside
`plugins/[slugname of plugin].js`. The object needs methods based on which event you want
to listen to. All events can be found in [the events page](../architecture/events.md).

You also need to add an entry for your plugin inside `plugins.js` which registers your plugin for use with Gekko. Finally you need to add a configuration object to `sample-config.js` with at least:

    config.[slug name of plugin] = {
      enabled: true
    }

> 💡 **Note:**  
> [plugins/ccxtMarketData/ccxtMarketData.md](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/ccxtMarketData/ccxtMarketData.md) is a working example of adding a plugin.
