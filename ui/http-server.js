const express = require('express');
//Lodash CDN  : https://github.com/lodash/lodash
var CDN = "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";

const app = express();

app.get('/', function (req, res) {
  res.send('HTTP CDN OPERATION')
})

// Register a local variable in your app which contains the CDN function
app.locals.CDN = function(path, type, classes, alt) {
    if(type == 'js') {
        return "<script src='"+CDN+path+"' type='text/javascript'></script>";
    } else if (type == 'css') {
        return "<link rel='stylesheet' type='text/css' href='"+CDN+path+"'/>";
    } else if (type == 'img') {
        return "<img class='"+classes+"' src='"+CDN+path+"' alt='"+alt+"' />";
    } else {
        return "";
    }
};

app.listen(3000)

module.exports = app;
