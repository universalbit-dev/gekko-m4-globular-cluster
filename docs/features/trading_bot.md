# Trading Bot

Once you have run enough simulations (using [backtesting](./backtesting.md) and [paper trading](./paper_trading.md)) and you are confident in your strategy, you can use Gekko as a trading bot.

Gekko will run your strategy on the live market and automatically trade on your exchange account when trade signals come out of your strategy.


## Key Points for Advanced Use

1. **Simulation Environment**: Before transitioning to live trading, focus on mastering JavaScript programming while using the simulation tools (like backtesting and paper trading). These tools allow you to test strategies without real-world risk, ensuring your strategy is robust and reliable.

2. **Advanced Users**: For expert programmers, the repository integrates the [CCXT library](https://github.com/ccxt/ccxt). This library facilitates communication with multiple cryptocurrency exchange APIs. Examples demonstrating its use are available in the repository's `examples` directory.

3. **Development Goals**: The platform is developed to support exchange simulation, backtesting, and obtaining live market data. Leveraging the CCXT library alongside the live trade bot enhances the scalability and modularity of the software.

By utilizing these tools and methods, you can build a more robust and adaptable trading system.

---
