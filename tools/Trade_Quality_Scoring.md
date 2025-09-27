## **Macrostructure Trading Bot (latest updates)**
- **Trade Quality Scoring Integrated:**

  - Uses a modular scoring system to evaluate each trade before execution, based on signal strength, win rate, risk/reward, volatility, and more.
  - Trades are only executed if the trade quality score exceeds a configurable threshold (e.g., 70), reducing noise and improving robustness.
  - Logs trade quality scores and breakdowns for every action (BUY/SELL/TP/SL/HOLD), enabling analytics and post-trade review.

- **Auto-Tuned Multi-Timeframe Selection:**  
  - Selects the best timeframe dynamically using model win rate and volatility checks.
  - Continues to use robust ensemble signals and auto-tuning of RSI/ATR per timeframe.

- **Configurable via `.env`:**  
  - Trade quality threshold and scoring weights can be set in `.env` for easy tuning.

---

## **Microstructure Trading Bot (latest updates)**
- **Trade Quality Scoring Integrated:** 

  - Same scoring module as macrostructure, applied before entry and after exit.
  - Skips noisy trades below the score threshold, logs score for every trade.

- **Fibonacci-Based Minimum Hold Time:**  
  - Position exits (TP/SL/timeout/partial) are only allowed after a configurable minimum hold time, set using Fibonacci values (e.g., ~12.5min for index 10).
  - Prevents immediate exits after entry, reduces noise and overtrading.
  - Configurable via `.env` (`FIB_HOLD_INDEX` or direct `MIN_HOLD_MS`).

- **Granular Logging & Adaptive Logic:**  
  - Logs hold times and skipped exits due to insufficient hold.
  - Adaptive thresholds for TP/SL and position sizing based on volatility.
  - Multi-frame confirmation and daily trade limits for robust risk management.

---

## **General Improvements**

- **Noise Reduction:**  
  Both bots now filter out low-quality, high-risk, or noisy trades using robust criteria and minimum hold times.
- **Configurability:**  
  Key parameters are tunable from `.env` (thresholds, weights, hold times), making strategy adjustment fast and simple.
- **Logging:**  
  Enhanced logging for quality scores, hold times, and skip reasons for full transparency.

---

**TL;DR:**  
Both bots now feature trade quality scoring, configurable minimum hold times (Fibonacci in microstructure), and improved noise reduction through robust filtering and analytics.
