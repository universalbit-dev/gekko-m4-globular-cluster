# 📈 ccxt_orders.js — Automated Crypto Trading Bot

Automated crypto trading system using [CCXT](https://github.com/ccxt/ccxt), Node.js, and custom signal logs.  
**Supports dynamic position sizing, strict minimum order handling, and real-time risk management.**

<div align="center">
  <img src="https://img.icons8.com/fluency/48/robot.png" alt="Bot" width="48"/>
  <img src="https://img.icons8.com/fluency/48/settings.png" alt="Settings" width="48"/>
</div>

---

## 🚀 Features

- **Signal-based trading**: Reads buy/sell signals from log files.
- **Exchange & pair selection**: Works with any CCXT-supported exchange (default: Kraken, BTC/EUR).
- **Dynamic order sizing**: 
  - Uses a fixed amount (`ORDER_AMOUNT`) or a percentage of available balance (`ORDER_PERCENT`).
  - Enforces a strict minimum per trade (`MIN_ALLOWED_ORDER_AMOUNT`).
- **Advanced entry/exit logic**:
  - Market BUY on strong bull signals.
  - Market SELL/SHORT on strong bear signals (if supported).
  - Exit/Cover on weak signals.
- **Adaptive thresholds**: Entry/exit signals adapt to recent volatility (PVVM/PVD).
- **Risk management**: Integrated stop loss and take profit triggers.
- **Safe trading**: Deduplicates signals and logs all actions/reasons.
- **Fully configurable**: All parameters via `.env`.

---

## 🛠️ Installation

```bash
npm install ccxt dotenv
```

---

## ⚙️ Configuration

Set up your `.env` file:

```env
EXCHANGE=kraken
KEY=your_api_key
SECRET=your_api_secret
PAIR=BTC/EUR

ORDER_AMOUNT=0.00006              # Default trade size in base currency
ORDER_PERCENT=0.05                # % of available balance for each order
MIN_ALLOWED_ORDER_AMOUNT=0.00006  # Absolute minimum per order (exchange rule)

INTERVAL_MS=3600000               # Bot cycle interval (ms)
STOP_LOSS_PCT=2                   # Stop loss (e.g., 2%)
TAKE_PROFIT_PCT=4                 # Take profit (e.g., 4%)

PVVM_BASE_THRESHOLD=8.5           # PVVM signal strength base
PVD_BASE_THRESHOLD=7.5            # PVD signal strength base
DYNAMIC_WINDOW=12                 # Signals to use for dynamic threshold
DYNAMIC_FACTOR=1.1                # Sensitivity multiplier
```

> **Tips:**  
> - Never share your API keys.  
> - Adjust `ORDER_PERCENT` for dynamic position sizing (recommended).  
> - Always set `MIN_ALLOWED_ORDER_AMOUNT` to your exchange’s minimum for the pair.

---

## 🏁 How It Works

1. **Reads signals** from logs, merging magnitude data if available.
2. **Calculates dynamic thresholds** for PVVM/PVD based on recent signal activity.
3. **Determines trade size**:
   - If `ORDER_PERCENT` is set, uses a percentage of your available base balance.
   - Otherwise, uses `ORDER_AMOUNT`.
   - Always ensures order size is **at least** `MIN_ALLOWED_ORDER_AMOUNT`.
4. **Executes trades** on valid signals.
   - Entry: Bullish or bearish signals depending on your current position.
   - Exit: Weak bull/bear signals, or stop loss/take profit triggers.
5. **Logs every trade** and the reasoning for transparency.
6. **Never double-trades** the same signal.

---

## 🧮 Order Sizing Example

```js
// JavaScript logic inside ccxt_orders.js
const ORDER_PERCENT = parseFloat(process.env.ORDER_PERCENT) || 0.05;
const MIN_ALLOWED_ORDER_AMOUNT = parseFloat(process.env.MIN_ALLOWED_ORDER_AMOUNT) || 0.00006;
const balance = await exchange.fetchBalance();
const baseCurrency = PAIR.split('/')[0];
const available = balance.free[baseCurrency] || 0;

let orderSize = ORDER_AMOUNT;
if (ORDER_PERCENT > 0 && available > 0) {
  orderSize = available * ORDER_PERCENT;
}
orderSize = Math.max(orderSize, MIN_ALLOWED_ORDER_AMOUNT);
```

---

## 📊 PVVM/PVD Strength Table

| Value    | Strength      | Meaning                    |
|----------|--------------|----------------------------|
| 0 - 3    | 💤 Very Weak  | Insignificant/noise        |
| 3 - 7    | ☁️ Weak      | Minor, low conviction      |
| 7 - 10   | 🌤 Moderate  | Meaningful                 |
| 10 - 20  | 🌞 Significant| Strong move                |
| > 20     | ⚡ Very Strong| High conviction/trend      |

---

## 📉 Volatility & Position Sizing

| Avg PVVM/PVD | Risk/Volatility | Suggested ORDER_PERCENT | Description                  |
|--------------|-----------------|------------------------|------------------------------|
| 0 - 3        | 🟢 Very Low     | 0.10 (10%)             | Calm, higher position        |
| 3 - 7        | 🟡 Low          | 0.07 (7%)              | Moderate risk                |
| 7 - 10       | 🟠 Moderate     | 0.05 (5%)              | Typical market               |
| 10 - 20      | 🔴 High         | 0.03 (3%)              | Large moves, reduced size    |
| > 20         | ⚫ Very High    | 0.01 (1%)              | Extreme, minimal size        |

_Position size is **scaled inversely** to volatility for safety._

---

## 📋 Usage

Start the bot with:

```bash
node tools/ccxt_orders.js
```

- Checks signals and trades at each interval.
- All results are logged in `ccxt_order.log`.

---

## 🗂️ Log Files

- `ccxt_signal.log`: Raw signals
- `ccxt_signal_magnitude.log`: Signals with magnitude
- `ccxt_order.log`: All trade actions and outcomes

---

## 🧐 Signal Types & Actions

| Signal         | Action        |
|----------------|---------------|
| bull           | Market BUY    |
| strong_bull    | BUY (stronger)|
| bear           | Market SELL/SHORT|
| strong_bear    | SELL/SHORT (stronger)|
| weak_bull      | Exit/Cover    |
| weak_bear      | Exit/Cover    |

*Shorting only works if your exchange/pair supports it.*

---

## 🛡️ Risk Management

- **Dynamic position sizing**: Trades scale with volatility and available balance.
- **Stop loss/take profit**: Automated protection.
- **Deduplication**: Never repeats a trade on the same signal.
- **Minimum order enforcement**: No exchange rejections for small trades.

---

## 🙋 FAQ

**Q:** What exchanges are supported?  
> All CCXT exchanges (default: Kraken)

**Q:** How do I disable shorting?  
> Remove bear/short logic from the script if your exchange or pair does not support it.

**Q:** Where are logs stored?  
> See `tools/ccxt_order.log` for a complete trade record.

**Q:** How to adjust risk?  
> Edit `ORDER_PERCENT`, PVVM/PVD thresholds, and `DYNAMIC_FACTOR` in `.env`.

---

## 🧠 Summary

> **ccxt_orders.js** intelligently sizes positions and manages risk using volatility-aware logic. It only trades when signals are strong, logs all actions, and always respects the exchange’s minimums.

---

**For advanced tweaks, see [`tools/ccxt_orders.js`](../tools/ccxt_orders.js) or open an Issue.**

---

Happy Gekko! 🚀

---
