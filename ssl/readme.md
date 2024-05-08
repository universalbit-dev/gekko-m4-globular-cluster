[OpenSSL](https://github.com/openssl/openssl)
#### self-signed certificate with OpenSSL
```
sudo apt install openssl
```
* create self-signed certificate before run https server :
```
cd ~/gekko-m4/ssl
openssl genrsa 2048 > host.key
chmod 400 host.key
openssl req -new -x509 -nodes -sha256 -days 365 -key host.key -out host.cert -config distinguished.cnf
```

* start user interface:
```
cd ~/gekko-m4
pm2 start xor_ui.config.js
```

navigate to url: https://localhost:4421/
