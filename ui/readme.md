## HTTP AND HTTPS Server : "CDN OPERATION"

#### ssl certificate required for start https server:
```bash
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
```

#### [Pm2 advanced process manager](https://pm2.keymetrics.io/)
```bash
pm2 start http-server.js
pm2 start https-server.js
```
##### port:  
* http:3000  
* https:4000


#### [Quick Start Pm2](https://pm2.keymetrics.io/docs/usage/quick-start/)
```bash
pm2 status
```
#### [Monitor Process](https://pm2.keymetrics.io/docs/usage/monitoring/)
```bash
pm2 monit
```

* [NodeJs-HTTPS-API](https://nodejs.org/api/https.html)
  
