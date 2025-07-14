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
EXCHANGE=kraken         # Exchange name
KEY=your_api_key        # API key
SECRET=your_api_secret  # API secret
PAIR=BTC/EUR            # Trading pair
ORDER_AMOUNT=0.00005    # Default trade size
INTERVAL_KEY=30m        # Signal check interval (5m, 15m, 30m, 1h, 24h)
STOP_LOSS_PCT=2         # Stop loss percentage
TAKE_PROFIT_PCT=4       # Take profit percentage
```

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
