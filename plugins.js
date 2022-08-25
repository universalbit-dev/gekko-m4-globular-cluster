var plugins = [
  {
    name: 'Candle writer',
    description: 'Store candles in a database',
    slug: 'candleWriter',
    async: true,
    modes: ['realtime', 'importer','backtest'],
    path: config => config.adapter + '/writer',
    version: 0.1,
  },
  {
    name: 'Trading Advisor',
    description: 'Calculate trading advice',
    slug: 'tradingAdvisor',
    async: true,
    modes: ['realtime', 'backtest','importer'],
    emits: true,
    path: config => 'tradingAdvisor/tradingAdvisor.js',
  },
  {
    name: 'IRC bot',
    description: 'IRC module lets you communicate with Gekko on IRC.',
    slug: 'ircbot',
    async: false,
    modes: [''],
    dependencies: [{
      module: 'irc',
      version: '0.5.2'
    }]
  },
  {
    name: 'Telegram bot',
    description: 'Telegram module lets you communicate with Gekko on Telegram.',
    slug: 'telegrambot',
    async: false,
    modes: [''],
    dependencies: [{
      module: 'node-telegram-bot-api',
      version: '0.24.0'
    }]
  },
  {
    name: 'XMPP bot',
    description: 'XMPP module lets you communicate with Gekko on Jabber.',
    slug: 'xmppbot',
    async: false,
    silent: false,
    modes: [''],
    dependencies: [{
      module: 'node-xmpp-client',
      version: '3.0.2'
    }]
  },
  {
    name: 'Pushover',
    description: 'Sends pushover.',
    slug: 'pushover',
    async: false,
    modes: [''],
    dependencies: [{
      module: 'pushover-notifications',
      version: '0.2.3'
    }]
  },
  {
    name: 'Campfire bot',
    description: 'Lets you communicate with Gekko on Campfire.',
    slug: 'campfire',
    async: false,
    modes: [''],
    dependencies: [{
      module: 'ranger',
      version: '0.2.4'
    }]
  },
  {
    name: 'Mailer',
    description: 'Sends you an email everytime Gekko has new advice.',
    slug: 'mailer',
    async: true,
    modes: [''],
    dependencies: [{
      module: 'emailjs',
      version: '1.0.5'
    }, {
      module: 'prompt-lite',
      version: '0.1.1'
    }]
  },
  {
    name: 'Advice logger',
    description: '',
    slug: 'adviceLogger',
    async: false,
    silent: true,
    modes: ['realtime']
  },
  {
    name: 'Trader',
    description: 'Follows the advice and create real orders.',
    slug: 'trader',
    async: true,
    modes: ['realtime','backtest'],
    emits: true,
    path: config => 'trader/trader.js',
  },
  {
    name: 'Paper Trader',
    description: 'Paper trader that simulates fake trades.',
    slug: 'paperTrader',
    async: false,
    modes: ['realtime', 'backtest'],
    emits: true,
    path: config => 'paperTrader/paperTrader.js',
  },
  {
    name: 'Performance Analyzer',
    description: 'Analyzes performances of trades',
    slug: 'performanceAnalyzer',
    async: false,
    modes: ['realtime', 'backtest'],
    emits: true,
    path: config => 'performanceAnalyzer/performanceAnalyzer.js',
  },
  {
    name: 'Redis beacon',
    slug: 'redisBeacon',
    description: 'Publish events over Redis Pub/Sub',
    async: true,
    modes: [''],
    dependencies: [{
      module: 'redis',
      version: '0.10.0'
    }]
  },
  {
    name: 'Pushbullet',
    description: 'Sends advice to pushbullet.',
    slug: 'pushbullet',
    async: false,
    modes: [''],
    dependencies: [{
      module: 'pushbullet',
      version: '1.4.3'
    }]
  },
  {
    name: 'Kodi',
    description: 'Sends advice to Kodi.',
    slug: 'kodi',
    async: false,
    modes: ['']
  },
  {
    name: 'Candle Uploader',
    description: 'Upload candles to an extneral server',
    slug: 'candleUploader',
    async: true,
    modes: ['']
  },
  {
    name: 'Twitter',
    description: 'Sends trades to twitter.',
    slug: 'twitter',
    async: false,
    modes: [''],
    dependencies: [{
      module: 'twitter',
      version: '1.7.1'
    }]
  },
  {
    name: 'Slack',
    description: 'Sends trades to slack channel.',
    slug: 'slack',
    async: false,
    modes: [''],
    dependencies: [{
      module: '@slack/client',
      version: '3.13.0'
    }]
  },
  {
    name: 'IFTTT',
    description: 'Sends trades to IFTTT webhook.',
    slug: 'ifttt',
    async: false,
    modes: ['']
  },
  {
    name: 'Event logger',
    description: 'Logs all gekko events.',
    slug: 'eventLogger',
    async: false,
    modes: ['realtime', 'backtest'],
    greedy: true
  },
  {
    name: 'Backtest result export',
    description: 'Exports the results of a gekko backtest',
    slug: 'backtestResultExporter',
    async: false,
    modes: ['backtest','realtime']
  },
  {
    name: 'Child to parent',
    description: 'Relays events from the child to the parent process',
    slug: 'childToParent',
    async: false,
    modes: ['realtime'],
    greedy: true
  },
  {
    name: 'Blotter',
    description: 'Writes all buy/sell trades to a blotter CSV file',
    slug: 'blotter',
    async: false,
    modes: ['realtime'],
  },
];

module.exports = plugins;
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
