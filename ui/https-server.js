const https = require("https");
const fs = require("fs-extra");

//Lodash CDN : https://github.com/lodash/lodash
var CDN = "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";

//Import the express module
const express = require("express");

//Instantiate an Express application
const app = express();

//Create a NodeJS HTTPS listener on port 4000 that points to the Express app
//Use a callback function to tell when the server is created.

//Register a local variable in your app which contains the CDN function
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

https
  .createServer(
//Provide the private and public key to the server by reading each
//file's content with the readFileSync() method.
    {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    },
    app
)
//Create an try point route for the Express app listening on port 4000.
//Once the request is received, it will display a message "HTTPS CDN OPERATION"
  .listen(4000, () => {
    app.get('/', (req,res)=>{res.send("HTTPS CDN OPERATION")})
  });




