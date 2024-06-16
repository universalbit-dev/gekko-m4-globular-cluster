##### gekko-m4 troubleshooter file: 
Troubleshoot known issues 

##### running....
```
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
npm i
pm2 start ecosystem.config.js
```
---
#### * NPM gyp ERR!
* NPM Returns Error
```
 gyp ERR! stack Error: `gyp` failed with exit code: 1
 npm ERR! ModuleNotFoundError: No module named 'distutils'
```
cause: required python3  installer program: [pip](https://docs.python.org/3/installing/index.html)
* fixed issue whit this command
```
sudo apt install python3-pip
```
---
---

#### * gekko-m4-globular-cluster folder not found
cause: git package not installed
* fixed issue with this command
```
sudo apt install git
```
---
---

#### * PM2 not found

* PM2 Returns Error
```
* Command 'pm2' not found, did you mean:
```
cause: PM2 Process Manager must be installed globally within the project
* fixed issue whit this command
```
npm i pm2 -g
                        -------------

__/\\\\\\\\\\\\\____/\\\\____________/\\\\____/\\\\\\\\\_____
 _\/\\\/////////\\\_\/\\\\\\________/\\\\\\__/\\\///////\\\___
  _\/\\\_______\/\\\_\/\\\//\\\____/\\\//\\\_\///______\//\\\__
   _\/\\\\\\\\\\\\\/__\/\\\\///\\\/\\\/_\/\\\___________/\\\/___
    _\/\\\/////////____\/\\\__\///\\\/___\/\\\________/\\\//_____
     _\/\\\_____________\/\\\____\///_____\/\\\_____/\\\//________
      _\/\\\_____________\/\\\_____________\/\\\___/\\\/___________
       _\/\\\_____________\/\\\_____________\/\\\__/\\\\\\\\\\\\\\\_
        _\///______________\///______________\///__\///////////////__


                          Runtime Edition

```
---
---

