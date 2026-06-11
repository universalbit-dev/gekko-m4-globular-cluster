# [Tulip indicators](https://tulipindicators.org/) 
[[Built-in by default]]

# Tulip Indicators Reference

This technical details configurations, execution mechanics, mathematical functions, and implementation signatures for the strategy engine's indicator suite.

---

## 01. Implementation

To utilize a Tulip-backed indicator within a programmatic trading strategy module, it must be declared during the initialization phase and subsequently extracted during regular chart bar/candle updates.

### Generic Component Design Pattern

```js
init: function() {   
  // 1. Register the indicator component and map input options
  this.addTulipIndicator('unique_label', 'indicator_type', { 
    optInTimePeriod: this.settings.myPeriod 
  });
},

check: function(candle) {
  // 2. Extract calculations into variables during the polling tick
  var singleResult = this.tulipIndicators.unique_label.result.result;
}

```

### Multi-Output Result Mapping Pattern

```js
// Example: Tracking multiple directional components (e.g., DI+/DI-)
this.addTulipIndicator('di_group', 'di', { optInTimePeriod: this.settings.diPeriod });

// Extraction from multi-key result structures
var plusCurve  = this.tulipIndicators.di_group.result.diPlus;
var minusCurve = this.tulipIndicators.di_group.result.diMinus;

```

---

## 02. Comprehensive Indicator Matrix

The following matrix documents the complete indicator catalog, including internal mathematical functions, execution dependencies, and programmatic configuration properties.

```text
┌───────────┬────────────────────────────────────────────────────────┬──────────────────────────────────┐
│ Indicator │ Core Functional Description & Mathematical Expressions │ Required Options/Parameters      │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ dema      │ Double Exponential Moving Average. Drastically reduces │ optInTimePeriod                  │
│           │ baseline smoothing lag by doubling the EMA factor.     │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ ema       │ Exponential Moving Average. Weights recent bars        │ optInTimePeriod                  │
│           │ exponentially higher than past periods.                │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ emv       │ Ease of Movement. Quantifies the relationship between   │ [None]                           │
│           │ price changes and underlying execution volume.         │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ fisher    │ Fisher Transform. Converts asset prices into a Gaussian│ optInTimePeriod                  │
│           │ normal distribution to isolate peak price reversals:   │                                  │
│           │   Y = 0.5 * ln((1 + X) / (1 - X))                      │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ fosc      │ Forecast Oscillator. Compares a moving linear least-   │ optInTimePeriod                  │
│           │ squares regression trendline against actual raw close. │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ hma       │ Hull Moving Average. Achieves extreme speed smoothing  │ optInTimePeriod                  │
│           │ using nested Weighted Moving Averages:                 │                                  │
│           │   HMA = WMA(2 * WMA(n/2) - WMA(n), sqrt(n))            │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ kama      │ Kaufman Adaptive Moving Average. Self-adjusts noise-   │ optInTimePeriod                  │
│           │ filtering lag based on localized price efficiency:     │                                  │
│           │   KAMA(t) = KAMA(t-1) + sc(t) * (Price - KAMA(t-1))    │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ kvo       │ Klinger Volume Oscillator. Determines structural money │ optInFastPeriod                  │
│           │ flows based on High-Low volume accumulation trends.   │ optInSlowPeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ linreg    │ Linear Regression. Evaluates least-squares trend       │ optInTimePeriod                  │
│           │ formulas over a trailing window to predict value bars. │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ linreginc │ Linear Regression Intercept calculations.              │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ linregslo │ Linear Regression Slope calculations.                  │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ macd      │ Moving Average Convergence/Divergence indicator.       │ optInFastPeriod                  │
│           │                                                        │ optInSlowPeriod                  │
│           │                                                        │ optInSignalPeriod                │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ marketfi  │ Market Facilitation Index. Gauges efficiency:          │ [None]                           │
│           │   MFI = (High - Low) / Volume                          │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ mass      │ Mass Index. Flags dynamic trend exhaustion points by   │ optInTimePeriod                  │
│           │ analyzing fluctuations in EMA high-low spreads.        │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ medprice  │ Median Price baseline:                                 │ [None]                           │
│           │   medprice(t) = (High(t) + Low(t)) / 2                 │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ mfi       │ Money Flow Index. Momentum ratio scaled by volume.     │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ msw       │ MESA Sine Wave. Employs Maximum Entropy Spectrum       │ optIn                            │
│           │ Analysis plots to distinguish trend vs cycle regimes.  │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ natr      │ Normalized Average True Range. Percent volatility index│ optInTimePeriod                  │
│           │ relative to price: natr = (ATR(t) / Close(t)) * 100    │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ nvi       │ Negative Volume Index. Evaluates smart money movements │ [None]                           │
│           │ on days with decelerating trading volume.              │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ obv       │ On-Balance Volume. Cumulative running tally of volume  │ [None]                           │
│           │ flows tied directly to upward or downward candle closes│                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ ppo       │ Percentage Price Oscillator strategy curve lines.      │ optInFastPeriod                  │
│           │                                                        │ optInSlowPeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ psar      │ Parabolic Stop and Reverse price trailing matrix.      │ optInAcceleration                │
│           │                                                        │ optInMaximum                     │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ pvi       │ Positive Volume Index. Tracks retail market momentum  │ [None]                           │
│           │ on high-volume breakout periods.                       │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ qstick    │ Qstick. Tracks buying/selling pressure trends by       │ optInTimePeriod                  │
│           │ measuring an n-period moving average of (Close - Open).│                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ roc       │ Rate of Change. Measures velocity percentage speed vs  │ optInTimePeriod                  │
│           │ an evaluation point n bars ago.                        │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ rocr      │ Rate of Change Ratio. Raw ratio calculation.           │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ rsi       │ Relative Strength Index overbought/oversold boundaries.│ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ sma       │ Simple Moving Average unweighted rolling baseline curve│ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ stoch     │ Stochastic Oscillator price location bounds index.    │ optInFastKPeriod                 │
│           │                                                        │ optInSlowKPeriod                 │
│           │                                                        │ optInSlowDPeriod                 │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ sum       │ Sum Over Period. Returns cumulative raw value sums.     │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ tema      │ Triple Exponential Moving Average composite line:     │ optInTimePeriod                  │
│           │   TEMA = 3*EMA(in) - 3*EMA(EMA(in)) + EMA(EMA(EMA(in)))│                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ tr        │ True Range. The maximum variance value derived from    │ [None]                           │
│           │ current High-Low bounds and previous Close marks.      │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ trima     │ Triangular Moving Average. Parabolic weight distribution│ optInTimePeriod                  │
│           │ favoring data points in the middle of the window.      │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ trix      │ TRIX. 1-bar Rate of Change of a triple-smoothed EMA.   │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ tsf       │ Time Series Forecast. Plots terminal data limits       │ optInTimePeriod                  │
│           │ calculated using sequential linear models.             │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ typprice  │ Typical Price average: (High + Low + Close) / 3        │ [None]                           │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ ultosc    │ Ultimate Oscillator. Combines three separate historical│ optInTimePeriod1                 │
│           │ cycle horizons to filter false breakout flags.         │ optInTimePeriod2                 │
│           │                                                        │ optInTimePeriod3                 │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ vhf       │ Vertical Horizontal Filter. Detects whether structural │ optInTimePeriod                  │
│           │ market states are currently trending or consolidating. │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ vidya     │ Variable Index Dynamic Average. Adjusts internal EMA   │ optInFastPeriod                  │
│           │ smoothing factors dynamically using recent volatility. │ optInSlowPeriod                  │
│           │                                                        │ optInAlpha                       │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ volatility│ Annualized Historical Volatility statistics calculator. │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ vosc      │ Volume Oscillator (Fast Volume MA - Slow Volume MA).   │ optInFastPeriod                  │
│           │                                                        │ optInSlowPeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ vwma      │ Volume Weighted Moving Average. Adjusts price steps    │ optInTimePeriod                  │
│           │ proportional to raw bar transaction volume.            │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ wad       │ Williams Accumulation/Distribution running index totals│ [None]                           │
│           │ of directional pressure vs true range parameters.      │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ wcprice   │ Weighted Close Price: (High + Low + 2 * Close) / 4     │ [None]                           │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ wilders   │ Welles Wilder Smoothing engine fallback layout:         │ optInTimePeriod                  │
│           │   wilders = (EMA + 1) / 2                              │                                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ willr     │ Williams %R overbought / oversold momentum metrics.    │ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ wma       │ Weighted Moving Average assigning a linear matrix scale│ optInTimePeriod                  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ zlema     │ Zero-Lag Exponential Moving Average. Uses look-ahead  │ optInTimePeriod                  │
│           │ data offset subtraction to negate computation delay.   │                                  │
└───────────┴────────────────────────────────────────────────────────┴──────────────────────────────────┘
```
---

## 03. Concrete Configuration Integration Examples

The following production code blocks demonstrate how to declare and extract indicators across various analytical patterns.

### Example A: Average Directional Movement Index (`adx`)

```js
// 1. System Registry Configuration
init: function() {
  this.addTulipIndicator('adx_signal', 'adx', { 
    optInTimePeriod: this.settings.adx_period 
  });
},

// 2. Evaluation Engine Loop Ingestion
check: function(candle) {
  var adxStrength = this.tulipIndicators.adx_signal.result.result;
}

```

### Example B: True Range Absolute Variance Volatility (`tr`)

```js
// 1. System Registry Configuration (Zero Parameter Indicator)
init: function() {
  this.addTulipIndicator('volatility_tr', 'tr', {});
},

// 2. Evaluation Engine Loop Ingestion
check: function(candle) {
  var absoluteTrueRange = this.tulipIndicators.volatility_tr.result.result;
}

```

### Example C: Stochastic Momentum Oscillation Metrics (`stoch`)

```js
// 1. System Registry Configuration (Multi-Variable Boundary System)
init: function() {
  this.addTulipIndicator('stoch_oscillator', 'stoch', {
    optInFastKPeriod: 5,
    optInSlowKPeriod: 3,
    optInSlowDPeriod: 3
  });
},

// 2. Evaluation Engine Loop Ingestion (De-structuring multi-value curves)

check: function(candle) {
  var currentStochK = this.tulipIndicators.stoch_oscillator.result.stochK;
  var currentStochD = this.tulipIndicators.stoch_oscillator.result.stochD;
}

```
