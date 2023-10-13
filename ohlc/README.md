# ccxt-ohlcv-fetcher

fetches OHLC values from most crypto exchanges using ccxt library.
Saves candles to a sqlite database per symbol.
by default resumes from last candle fetched.

##### setup
##### install python3 and virtualenv:
```
sudo apt install python3 python3-pip
pip3 install virtualenv
```
##### [virtual python environments](https://github.com/pypa/virtualenv)
```
virtualenv --python=python3 virtualenv
source virtualenv/bin/activate

sudo pip3 install -r requirements.txt
```

##### sqlite installation on gnu/linux
```
sudo apt install sqlite sqlite3
```

##### run ccxt-ohlcv-fetcher

```
./ccxt-ohlcv-fetch.py
```
##### get 10 min candles of LTC/BTC data from kraken
```
./ccxt-ohlcv-fetch.py -s 'LTC/BTC' -e kraken -t 30m --debug

./ccxt-ohlcv-fetch.py -s 'LTC/BTC' -e kraken -t 30m --since 2023-08-27T00:00:00Z --debug
```

##### convert .sqlite to CSV File

```
sqlite3 kraken_XBTLTC_30m.sqlite

sqlite> .headers on
sqlite> .mode csv
sqlite> .output data.csv
sqlite> SELECT * FROM candles;
sqlite> .quit
```

##### Usage:
```
usage: ccxt-ohlcv-fetch.py [-h] -s SYMBOL -e EXCHANGE [-t TIMEFRAME] [--since SINCE] [--debug] [-r RATE_LIMIT] [-q]

CCXT Market Data Downloader

optional arguments:
  -h, --help            show this help message and exit
  -s SYMBOL, --symbol SYMBOL
                        The Symbol of the Instrument/Currency Pair To Download
  -e EXCHANGE, --exchange EXCHANGE
                        The exchange to download from
  -t TIMEFRAME, --timeframe TIMEFRAME
                        The timeframe to download. examples: 1m, 5m, 15m, 30m, 1h, 2h, 3h, 4h, 6h, 12h, 1d, 1M, 1y
  --since SINCE         The iso 8601 starting fetch date. Eg. 2018-01-01T00:00:00Z
  --debug               Print Sizer Debugs
  -r RATE_LIMIT, --rate-limit RATE_LIMIT
                        eg. 20 to increase the default exchange rate limit by 20 percent
  -q, --quit            exit program after fetching latest candle
```
