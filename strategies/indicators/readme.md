The provided files contain various technical indicators used in trading strategies. Here's an explanation of each:

### AO.js (Awesome Oscillator)
- **Purpose**: Measures market momentum.
- **Logic**: Uses two simple moving averages (SMA) of median prices. The difference between the short-term (5-period) and long-term (34-period) SMA gives the oscillator value.

### DX.js (Directional Movement Indicator)
- **Purpose**: Identifies the strength of a trend.
- **Logic**: Uses True Range (ATR) and calculates directional movement (DM) values. It then computes the directional index (DI) and the DX value based on these.

### ADX.js (Average Directional Movement Index)
- **Purpose**: Measures the strength of a trend.
- **Logic**: Uses the DX indicator to compute the ADX value, which smooths out the DX values over a period.

### ATR.js (Average True Range)
- **Purpose**: Measures market volatility.
- **Logic**: Uses True Range (TR) to calculate the average true range (ATR) over a specified period, smoothed using an SMA.

### CCI.js (Commodity Channel Index)
- **Purpose**: Identifies cyclical trends in a market.
- **Logic**: Uses typical price (average of high, low, and close) and compares it to the moving average of the typical price, normalized by mean deviation.

### DMI.js (Directional Movement Index)
- **Purpose**: Identifies trend direction and strength.
- **Logic**: Uses the ADX indicator to calculate DI (Directional Index) values for trend identification.

### SMA.js (Simple Moving Average)
- **Logic**: Implements the Simple Moving Average (SMA) indicator.
- **Purpose**: Used to smooth out price data by calculating the average price over a specified window length, helping to identify trends.

### SMMA.js (Smoothed Moving Average)
- **Purpose**: The Smoothed Moving Average (SMMA) is used to smooth out price data over a specified period, reducing noise and providing a clearer trend direction compared to a simple moving average.
- **Logic**:
  - Initializes with a specified weight and uses an instance of the Simple Moving Average (SMA) for initial calculations.
  - Maintains an array of historical prices.
  - Calculates the SMMA value.
  - Updates the SMMA value with each new price, incorporating both the current price and the previous SMMA value.

### STC.js (Schaff Trend Cycle)
- **Purpose**: The Schaff Trend Cycle (STC) is a momentum indicator that uses a combination of MACD and Stochastic Oscillator principles to identify trends and potential reversal points in the market.
- **Logic**:
  - Initializes with MACD settings (short, long, signal) and cycle/smooth factors.
  - Updates MACD values for each new price.
  - Applies Stochastic calculations twice to smooth MACD values, enhancing trend detection.
  - Uses Welles Wilder's smoothing method to further refine the trend cycle.
  - The final result is a smoothed trend cycle value indicating market momentum.

### STOCH.js (Stochastic Oscillator)
- **Logic**: Implements the Stochastic Oscillator Slow (STOCH) indicator.
- **Purpose**: Used to identify overbought or oversold conditions by comparing a security's closing price to its price range over a specified period.

### StopLoss.js
- **Purpose**: The Stop Loss indicator is designed to limit an investor's loss on a position by specifying a price at which the position will be sold if the price drops below a certain threshold.
- **Logic**:
  - Initializes with a specified threshold percentage.
  - Tracks the highest price reached by the asset.
  - Updates the stop loss price based on the highest price and the specified threshold.
  - Determines if the current price has fallen to or below the stop loss price, indicating it is time to sell.

### TRANGE.js (True Range)
- **Logic**: Implements the True Range (TR) indicator.
- **Purpose**: Used to measure market volatility by calculating the largest range between the high and low prices, and the previous close price.

### TRIX.js (Triple Exponential Average)
- **Logic**: Implements the TRIX (Triple Exponential Average) indicator.
- **Purpose**: Used to identify the rate of change in a triple exponentially smoothed moving average of a security's price, which helps in identifying momentum and potential trend reversals.

### TSI.js (True Strength Index)
- **Logic**: Implements the True Strength Index (TSI) indicator.
- **Purpose**: Used to identify the strength of a trend by measuring momentum and smoothing it using exponential moving averages (EMAs).

### UO.js (Ultimate Oscillator)
- **Purpose**: Combines three different time frames to reduce false signals.
- **Logic**: Calculates buying pressure (BP) and true range (TR) for three periods. It then combines these with specific weights to compute the ultimate oscillator value.


