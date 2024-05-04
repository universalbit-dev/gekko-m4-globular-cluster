const express = require('express');
const https = require('https');
const fs= require('fs-extra');
const { engine } = require('express-handlebars');
const app = express();
app.use(express.static('public'));
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
//!important: Never put objects on the req object straight in as the data XSS issue
//https://blog.shoebpatel.com/2021/01/23/The-Secret-Parameter-LFR-and-Potential-RCE-in-NodeJS-Apps/
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/api/data', (req, res) => {
    const data = []; // from sqlite database
    res.json(data);
});

var privateKey = fs.readFileSync('./ssl/host.key','utf8');
var certificate = fs.readFileSync('./ssl/host.cert','utf8');

https.createServer({key: privateKey,cert: certificate},
  app).listen(4421);
