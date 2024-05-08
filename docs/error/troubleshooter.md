##### gekko-m4 troubleshooter file: 
Troubleshoot known issues 

---
#### * NPM gyp ERR!
```
git clone https://github.com/universalbit-dev/gekko-m4.git
cd gekko-m4
npm i
```
* NPM Returns Error
```
 gyp ERR! stack Error: `gyp` failed with exit code: 1
 npm ERR! ModuleNotFoundError: No module named 'distutils'
```
cause:required python3  installer program: [pip](https://docs.python.org/3/installing/index.html)
fixed issue whit this command
```
sudo apt install python3-pip
```
---
---

#### * PM2 not found
```
git clone https://github.com/universalbit-dev/gekko-m4.git
cd gekko-m4
npm i
pm2 start ecosystem.config.js
```
* PM2 Returns Error
```
* Command 'pm2' not found, did you mean:
```
cause:PM2 Process Manager must be installed globally within the project
fixed issue whit this command
```
npm i pm2 -g
```
---
---

