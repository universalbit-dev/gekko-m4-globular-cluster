#### to better understand how it works
first attempts on android



##### Install and Run Gekko-M4 on Android Device

AnLinux    
[website](https://github.com/EXALAB/AnLinux-App)
Run Debian Gnu/Linux On Android Without Root Access, 
thanks for the Awesome Termux and PRoot, which make this project possible.


Termux Android terminal
[website](https://termux.dev/)


Follow AnLinux Wizard and setup your linux distro.

```
./start-debian.sh

```

Welcome to a linux debian distro for Android!



##### Update and Upgrade Packages:

apt update && apt upgrade


##### Install Build Essential and Git:

```
apt install build-essential git
```

###### NVM Node Version Manager:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```


##### Installation NodeJs version 12

```
nvm install 12
```

Gekko-M4
clone project and start learn

```
git clone https://universalbit.it:3000/universalbit-blockchain/Gekko-M4.git
```

Install Node-Gyp :

```
npm i node-gyp -g
```

Gekko-M4 node_modules:

```
npm i --build-from-source
```

Indicators and Database:

```
npm i tulind --save
npm i sqlite3 --save
```

exchange directory: /exchange

```
npm i --build-from-source
npm i sqlite3 --save
```
Thanks developers,all required node modules are ready.

##### Some note: a working example


* Webserver [lWS LighWeight Web Server](lWS (lightweight Web Server (lWS))
https://f-droid.org/packages/net.basov.lws.fdroid)
setup webserver on andoird []()

* Configure Address:[IP](https://universalbit.it:3000/universalbit-blockchain/Gekko-M4/src/master/docs/ip.md) and Port

* Exchange: 
Choose Register and Add Api Keys

* First Run: [Backtest] [Papertrade] [Realtime] 


* Setup Configuration Files and Plugins:


##### User Interface [UI Mode]

```
node gekko -c config.js --ui
```

###### [Terminal Mode] Without User Interface
```
node gekko -c config.js
```


##### Start Application using Pm2
```
npm i pm2 -g
pm2 start gekko-m4-nodejs_v12-ccxt.js

```
[#####Pm2 Process Manager](https://pm2.keymetrics.io/)

Pm2 Module System installation:
it is also possible to [manage](https://pm2.keymetrics.io/docs/advanced/pm2-module-system/) modules with pm2.

```
pm2 i module_name@version

```
### Resources:
* [Documentation](https://gekko.wizb.it/docs/installation/installing_gekko.html)
* [Forum](https://forum.gekko.wizb.it/)
* [Strategies](https://github.com/xFFFFF/Gekko-Strategies)
* [Extra-Indicators](https://github.com/Gab0/gekko-extra-indicators)

##### Offline Documentation: [doc](https://universalbit.it/blockchain/shared-files/1093/docs.tar.gz)


Gekko Support Multiple Exchange,Watchers and PaperTrader mode.
Backtest simulate and debug your strategy.   

```
tail -f logs/log_filename.log
```