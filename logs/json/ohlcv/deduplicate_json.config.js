module.exports = {
  apps : [
  {
  name: 'ohlcv ccxt JSON data deduplicate',
  script    : 'deduplicate_ohlcv_json.js',
  args      : 'ohlcv_ccxt_data.json ohlcv_ccxt_data.json',
  instances : "1",
  exec_mode : "cluster"
  },
  {
  name: 'ohlcv JSON data deduplicate',
  script    : 'deduplicate_ohlcv_json.js',
  args      : 'ohlcv_data.json ohlcv_data.json',
  instances : "1",
  exec_mode : "cluster"
  },
]
}
