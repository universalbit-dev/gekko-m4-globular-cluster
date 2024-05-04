[OpenSSL](https://github.com/openssl/openssl)
#### self-signed certificate with OpenSSL
```
sudo apt install openssl
openssl genrsa 2048 > host.key
chmod 400 host.key
openssl req -new -x509 -nodes -sha256 -days 365 -key host.key -out host.cert
```
