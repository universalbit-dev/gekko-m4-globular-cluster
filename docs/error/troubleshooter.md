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
required python3  installer program: [pip](https://docs.python.org/3/installing/index.html)
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

```
* Command 'pm2' not found, did you mean:
```
```
npm i pm2 -g
```

