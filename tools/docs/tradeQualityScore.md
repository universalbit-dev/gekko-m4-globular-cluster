# 🏅 Trade Quality Scoring Module

**File:** `tools/tradeQualityScore.js`  
**Context:** Macrostructure and Microstructure Trading Bots

---

## Overview

The Trade Quality Scoring module provides a quantitative way to evaluate the quality of trades executed by trading bots. It combines multiple aspects of trade performance and market conditions into a single score, with a breakdown of each component.

This helps developers and analysts:
- Assess the effectiveness of trading strategies
- Compare trades across different models or timeframes
- Identify areas for improvement (e.g., execution, signal strength, risk/reward)

---

## API

### `scoreTrade({ ...params })`

Calculates a trade quality score based on weighted factors.

#### **Parameters**

| Name              | Type    | Range/Example               | Description                                                            |
|-------------------|---------|-----------------------------|------------------------------------------------------------------------|
| `signalStrength`  | Number  | 0–100 (e.g., 90)            | Strength/confidence of the trading signal (bull/bear, etc.)            |
| `modelWinRate`    | Number  | 0–1 (e.g., 0.75)            | Win rate of the underlying trading model                               |
| `riskReward`      | Number  | >1 (TP/SL ratio, e.g., 2.1) | Ratio of take-profit to stop-loss; higher is better                    |
| `executionQuality`| Number  | 0–100                       | Quality of trade execution (slippage, fill, fees, etc.)                |
| `volatility`      | Number  | e.g., 5–150                 | Market volatility (ATR or stddev, normalized)                          |
| `tradeOutcome`    | Number  | -100 to +100                | % profit/loss after closing the trade                                  |
| `weights`         | Object  | defaults shown below         | Optional. Relative importance of each factor                           |

**Default weights:**
```js
{
  signalStrength: 0.20,
  modelWinRate: 0.20,
  riskReward: 0.15,
  executionQuality: 0.10,
  volatility: 0.10,
  tradeOutcome: 0.25,
}
```

#### **Returns**

An object containing:
- `totalScore` (Number): Final score (0–100)
- `breakdown` (Object): Detailed scores for each component

#### **Example**

```js
const { scoreTrade } = require('./tradeQualityScore');

const result = scoreTrade({
  signalStrength: 85,
  modelWinRate: 0.72,
  riskReward: 1.8,
  executionQuality: 92,
  volatility: 17,
  tradeOutcome: 4.7
});

console.log(result);
/*
{
  totalScore: 81.3,
  breakdown: {
    signalStrength: 85,
    winRateScore: 65,
    rrScore: 40,
    executionQuality: 92,
    volScore: 8.97,
    outcomeScore: 72.35,
    weights: { ... }
  }
}
*/
```

---

## Scoring Logic

- All factors are normalized to the 0–100 range for fair weighting.
- The final score is a weighted sum, allowing customization of factor importance.
- The breakdown helps diagnose which factors most influenced the score.

### Normalization Ranges

| Factor           | Min   | Max   | Notes                                  |
|------------------|-------|-------|----------------------------------------|
| Model Win Rate   | 0.2   | 1.0   | 20% to 100% win rate                   |
| Risk/Reward      | 1.0   | 3.0   | TP/SL ratio, usually >1                |
| Volatility       | 5     | 150   | ATR or stddev                          |
| Trade Outcome    | -10   | +10   | % profit/loss after trade              |

---

## Use Cases

- Score trades for reporting, dashboards, or strategy evaluation
- Filter or rank trades for post-trade analytics
- Integrate into automated optimization or selection pipelines

---

## Module Export

```js
module.exports = { scoreTrade };
```

---

## Icon

🏅 **Trade Quality Scoring**

---

## File Location

`tools/tradeQualityScore.js`
