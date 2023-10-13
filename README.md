##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)

### Gekko-[M4](http://www.wikisky.org/starview?object_type=4&object_id=3)
#### unlike easy gains
#### This software is for educational purposes only. Do not risk money which you are afraid to lose. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHORS AND ALL AFFILIATES ASSUME NO RESPONSIBILITY FOR YOUR TRADING RESULTS.

#### Learning [Javascript](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/learning/javascript)
#### [Gekko may also refer to:](https://en.wikipedia.org/wiki/Gekko_(disambiguation))
-----

#### Gekko-M4 Engine Now using node v20.8.0 (npm v10.1.0)
#### Required Packages:
```
sudo apt install curl git build-essential
```
##### NVM Node Version Manager:
nvm allows you to quickly install and use different versions of node via the command line.
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

##### [NodeJs 20](https://nodejs.org/en/blog/release/v20.0.0)

```
nvm install 20
nvm use 20
```

clone project:
```
git clone https://github.com/universalbit-dev/gekko-m4.git
cd gekko-m4
```
#### Install:
-Engine
```
npm i && npm audit fix
```
Thanks developers.

* [Learning Together](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)

#### Import
```
node gekko.js -c method-nn.js --import
```
#### Backtest
```
node gekko.js -c method-nn.js --backtest
```

### [BackTest-Tool]

#### Required Packages:
```
sudo apt install perl libdatetime-perl libjson-perl perlbrew
```

[PerlBrew](https://perlbrew.pl/)
```
\curl -L https://install.perlbrew.pl | bash
perlbrew install perl-5.36.1
perlbrew switch perl-5.36.1
```

#### Perl Modules:
```
sudo cpan install Parallel::ForkManager Time::Elapsed Getopt::Long List::MoreUtils File::chdir Statistics::Basic DBI  DBD::SQLite JSON::XS TOML File::Basename File::Find::Wanted Template LWP::UserAgent LWP::Protocol::https Set::CrossProduct DBD::CSV Text::Table File::Copy Net::SSL Net::SSLeay DBI
```

#### Run backtest-tool
```
./backtest.pl
```
#### Usage
```
usage: ./backtest.pl [mode] [optional parameter]
To run other features ./backtest.pl -h
```

#### Run Gekko-M4 
```
npm i pm2 -g
pm2 start nn.js --env development
pm2 monit 
``` 
* [Pm2 Process Manager](https://pm2.keymetrics.io/docs/usage/quick-start/)
* [Generating a Startup Script](https://pm2.keymetrics.io/docs/usage/startup/)

#### Indicators:
#### [Tulip Node](https://www.npmjs.com/package/tulind)
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.
```
npm install tulind --build-from-source
```

---
#### Resources:
* Gekko-Quasar-UI [0.6.9-m4](https://github.com/universalbit-dev/gekko-quasar-ui)
* Webserver [Apache2 and Nginx](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/webserver.md)
* [Docs](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)
* [Gekko WebSite](https://gekko.wizb.it/docs/installation/installing_gekko.html)
* [Forum](https://forum.gekko.wizb.it/)
* [Strategies](https://github.com/xFFFFF/Gekko-Strategies)
* [Extra-Indicators](https://github.com/Gab0/gekko-extra-indicators)
* [Legal context](https://www.europarl.europa.eu/cmsdata/150761/TAX3%20Study%20on%20cryptocurrencies%20and%20blockchain.pdf)

##### [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html)




