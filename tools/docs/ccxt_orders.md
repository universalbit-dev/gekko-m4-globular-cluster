# 📈 ccxt_orders.js Documentation

Automated crypto trading bot using [CCXT](https://github.com/ccxt/ccxt), Node.js, and custom signal logs.

<div style="text-align:center">
  <img src="https://img.icons8.com/fluency/48/crypto-coin.png" alt="" width="48"/>
  <img src="https://img.icons8.com/fluency/48/robot.png" alt="Bot Icon" width="48"/>
  <img src="https://img.icons8.com/fluency/48/settings.png" alt="Settings Icon" width="48"/>
</div>

---

## 🚀 Features

- 📊 Loads buy/sell signals from log files (`ccxt_signal.log`, `ccxt_signal_magnitude.log`)
- 🏦 Trades on the specified exchange (default **Kraken**) and pair (default **BTC/EUR**)
- 🐂 Market **BUY** on `bull`/`strong_bull` signals when not in position
- 🐻 Market **SELL/SHORT** on `bear`/`strong_bear` signals when not in position (if supported)
- 🔄 Market **SELL/Cover** on `weak_bull`/`weak_bear` signals with PVVM/PVD near zero when in position
- ⚡ Dynamic PVVM/PVD thresholds for smarter entries/exits
- 📏 Adjustable trade size based on signal strength
- 🛑 Supports **Stop Loss** and **Take Profit** triggers
- ☑️ Deduplication to avoid double trading
- 📝 Logs all actions & reasons to `ccxt_order.log`
- 🔧 Configurable via environment variables

---

## 🛠️ Setup

```bash
npm install ccxt dotenv
```
---

## ⚙️ Configuration

Set environment variables in a `.env` file:
```env
EXCHANGE=kraken            # Exchange name (e.g., kraken, binance)
KEY=your_api_key           # Your exchange API key
SECRET=your_api_secret     # Your exchange API secret
PAIR=BTC/EUR               # Trading pair
ORDER_AMOUNT=0.00005       # Default trade size in base currency
INTERVAL_MS=3600000        # Signal check interval in milliseconds (e.g., 3600000=1h, 900000=15m)
STOP_LOSS_PCT=2            # Stop loss percentage (e.g., 2 for 2%)
TAKE_PROFIT_PCT=4          # Take profit percentage (e.g., 4 for 4%)

PVVM_BASE_THRESHOLD=8.5    # Default PVVM move strength threshold
PVD_BASE_THRESHOLD=7.5     # Default PVD move strength threshold
DYNAMIC_WINDOW=12          # Number of signals used for dynamic threshold calculation
DYNAMIC_FACTOR=1.1         # Multiplier for threshold sensitivity (lower = more sensitive)
```

**Notes:**
- `INTERVAL_MS` must be consistent across related scripts for synchronized signal checks.
- PVVM/PVD parameters control dynamic signal sensitivity.  
- Keep your API keys private.
---

## 🏁 How It Works

1. **Reads Signals**: Loads and merges signals from log files.
2. **Dynamic Thresholds**: Calculates PVVM/PVD thresholds based on recent activity.
3. **Trade Logic**:
   - **Entry**: Buys on bull signals, sells/shorts on bear signals if allowed.
   - **Exit**: Sells/covers on weak signals.
   - **Stop Loss/Take Profit**: Monitors price after entry.
4. **Trade Size Adjustment**: Increases/decreases order size based on signal magnitude.
5. **Logging**: Every action and reason is logged for review.

---

## 📊 PVVM/PVD Strength Table

| Value    | Strength      | Meaning                    |
|----------|--------------|----------------------------|
| 0 - 3    | 💤 Very Weak  | Noise, likely insignificant|
| 3 - 7    | ☁️ Weak       | Minor move, low conviction |
| 7 - 10   | 🌤 Moderate   | Becoming meaningful        |
| 10 - 20  | 🌞 Significant| Strong move, worth trading |
| > 20     | ⚡ Very Strong| High conviction, strong trend |

---

## 📋 Usage

Start the bot:

```bash
node tools/ccxt_orders.js
```

The bot will:
- Check for new signals every interval.
- Execute trades as per the above logic.
- Log results and reasons to `ccxt_order.log`.

---

## 📁 Log Files

- `ccxt_signal.log` — Raw signals
- `ccxt_signal_magnitude.log` — Signals with magnitude info
- `ccxt_order.log` — Trade actions and outcomes

---

## 🙋 FAQ

**Q:** What exchanges are supported?
> Any exchange supported by CCXT (default: Kraken)

**Q:** How do I disable shorting?
> Remove bear/short logic in the script if your exchange/pair does not support short selling.

**Q:** Where do I find trade logs?
> See `tools/ccxt_order.log` for detailed records.

---

## 👤 Author

- universalbit-dev

🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
