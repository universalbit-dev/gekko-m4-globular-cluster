/*
The provided module exports a configuration object for a trading bot application. Here's a brief explanation of its components:

    strategies: An array of strategy names to be used (e.g., 'PPO', 'CCI', 'RSI', 'DEMA').
    pairs: Specifies trading pairs (e.g., 'ccxt_exchanges:BTC:LTC').
    warmup: Warmup period settings.
    from and to: Start and end dates for the trading period.
    default_set: Default trading set.
    csv: Path to the CSV file for data storage.
    note: A note about the run.
    top_strategy_sort1 and top_strategy_sort2: Sorting methods for top strategies.
    top_dataset_sort1 and top_dataset_sort2: Sorting methods for top datasets.
    cmc_data: Whether to use CoinMarketCap data.
    summary_interval: Interval in seconds for printing summaries.
    print_analysis_on_summary, print_all_results, print_top_strategy, print_top_dataset, print_roundtrips: Flags to control printing of various results and analyses.
    all_results_min_profit, all_results_min_profit_market, all_results_min_profit_day, all_results_min_trades_day, all_results_max_trades_day, all_results_min_hodl_time, all_results_max_hodl_time, all_results_limit: Filters and limits for printing all results.
    top_strategy_limit and top_dataset_limit: Limits for the number of top strategies and datasets to print.
    use_toml_files: Whether to use TOML configuration files.
    toml_directory: Directory for TOML files.
    keep_logs: Whether to keep logs.
    threads: Number of threads to use.
    stfu: Flag to suppress output.
    stratsettings: Settings for individual strategies.
    asset_c and currency_c: Initial asset and currency balances.
    fee_maker and fee_taker: Maker and taker fees.
    fee_using: Which fee to use ('maker' or 'taker').
    slippage: Slippage percentage.
    riskFreeReturn: Risk-free return rate.

*/

module.exports = {
  strategies: ['PPO','CCI','RSI','DEMA'],
  pairs: ['ccxt_exchanges:BTC:LTC'],
  warmup: ['10:73'],
  from: '2025-00-00 00:00:00',
  to: '2025-00-00 00:00:00',
  default_set: 'ccxt_exchanges:BTC',
  csv: 'database.csv',
  note: 'first run',
  top_strategy_sort1: 'method_01',
  top_strategy_sort2: 'method_02',
  top_dataset_sort1: 'dataset_01',
  top_dataset_sort2: 'dataset_02',
  cmc_data: 'no',
  summary_interval: 60,
  print_analysis_on_summary: 'yes',
  print_all_results: 'yes',
  all_results_min_profit: -999999999,
  all_results_min_profit_market: -99999999999,
  all_results_min_profit_day: -9999,
  all_results_min_trades_day: 0,
  all_results_max_trades_day: 99999,
  all_results_min_hodl_time: 1,
  all_results_max_hodl_time: 99999,
  all_results_limit: 100,
  print_top_strategy: 'yes',
  top_strategy_sort1: 'trades_win',
  top_strategy_sort2: 'avg_profit',
  top_strategy_limit: 100,
  print_top_dataset: 'yes',
  top_dataset_sort1: 'trades_win',
  top_dataset_sort2: 'best_PL',
  top_dataset_limit: 100,
  print_roundtrips: 'no',
  use_toml_files: 'no',
  toml_directory: '',
  keep_logs: 'no',
  threads: 5,
  stfu: 'no',
  stratsettings: { dema:{},rsi:{},ppo:{},cci:{} },
  asset_c: 1,
  currency_c: 100,
  fee_maker: 0.25,
  fee_taker: 0.25,
  fee_using: 'maker',
  slippage: 0.5,
  riskFreeReturn: 5
};
