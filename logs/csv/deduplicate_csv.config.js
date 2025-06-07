module.exports = {
  apps : [
  {
  name: 'ohlcv CSV data deduplicate',
  script    : 'deduplicate_ohlcv_csv.js',
  args      : 'ohlcv_data.csv ohlcv_data.csv',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'ohlcv ccxt CSV data deduplicate',
  script    : 'deduplicate_ohlcv_csv.js',
  args      : 'ohlcv_ccxt_data.csv ohlcv_ccxt_data.csv',
  instances : "1",
  exec_mode : "cluster"
  },
]
}


