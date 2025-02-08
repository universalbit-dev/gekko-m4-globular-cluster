/* copilot explain
This import.js file is a configuration script for the Gekko trading bot. Here's an explanation of its key components:

    General Settings:
        config.debug: Enables debug mode.
        config.watch: Specifies the exchange, currency, and asset to watch.

    Date Range:
        Sets config.from to the first day of the previous month.
        Sets config.to to the first day of the current month.
        config.importer: Specifies that importing is enabled and sets the date range.

    Database Configuration:
        config.adapter: Uses sqlite as the database adapter.
        config.sqlite: Specifies the path, data directory, version, and dependencies for SQLite.

    Candle Writer:
        config.candleWriter: Enables the candle writer and sets the adapter to sqlite.

The script exports the config object for use in other parts of the application.
*/
var config = {};
//General Settings
config.debug =true;

config.watch = {exchange: '',currency:'BTC',asset:'LTC'};
//Date.prototype.toISOString()

//Previous Month
var previous_month = new Date();
previous_month.setDate(1);
previous_month.setMonth(previous_month.getMonth()-1);
previous_month.setDate(2); 
config.from=previous_month;

//Current Month
var current_month = new Date();
current_month.setDate(1);
current_month.setMonth(current_month.getMonth());
current_month.setDate(2); 
config.to=current_month;

config.importer = {enabled:true,daterange:{from:previous_month,to:current_month}};
//DataBase
config.adapter='sqlite';config.adapter.path= 'plugins/sqlite';
config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module: 'sqlite3',version:'5.1.7'}] };
//Candle Writer
config.candleWriter={enabled:true,adapter:'sqlite'};
config['I understand that Gekko only automates MY OWN trading strategies']=true;
module.exports = config;

/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Disclaimer:
                              USE AT YOUR OWN RISK!
The author of this project and contributors are NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected
or specified. Please consider testing it first with paper trading and/or
backtesting on historical data. Also look at the code to see what how
it is working.
*/
