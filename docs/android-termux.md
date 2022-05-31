#### to better understand how it works
first attempts on android



##### Install and Run Gekko-M4 on Android Device.


Linux Debian on Android : Application

AnLinux
Run Linux On Android Without Root Access, thanks for the Awesome Termux and PRoot, which make this project possible.

and Termux Android terminal.

Follow AnLinux Wizard and setup your linux distro.

```
./start-debian.sh

```

Welcome to a linux debian distro for Android!



##### Update and Upgrade Packages:

apt get update && apt get upgrade


##### Install Build Essential:

```
apt install build-essential
```

###### NVM Node Version Manager:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```






























Android Terminal
Application Website: [Termux](https://termux.com/)


Nodejs installation:

```
pkg install nodejs-lts

```

these programs are needed:

```
pkg install wget git 

```

gekko-m4 source code:

```
wget https://universalbit.it:3000/universalbit-blockchain/Gekko-M4/archive/master.tar.gz

```

unfortunately the installation  is not successful (nodejs 16: required noddejs12) and trying to use the node_modules archives. 




#### Nginx Web Server 

```
pkg install nginx
```


the papertrade realtime and backtest mode are not tested.

[nginx webserver (Termux)]()



these two files are used to set the ip address:

[baseUIconfig](https://universalbit.it:3000/universalbit-blockchain/Gekko-M4/src/master/web/baseUIconfig.js)
[UiConfig](https://universalbit.it:3000/universalbit-blockchain/Gekko-M4/src/master/web/vue/statics/UiConfig.js)


#### Start Application using Pm2 (nodejs-lts version 16)

npm i pm2 -g
pm2 start gekko-m4-nodejs_v12-ccxt.js

[#####Pm2 Process Manager](https://pm2.keymetrics.io/)










