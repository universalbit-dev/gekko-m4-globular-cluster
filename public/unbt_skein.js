/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var sequence = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function sequence() {console.log('');await sequence;
};

/* async keep calm and make something of amazing */
var keepcalm = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length) / Math.floor(Math.random() * fibonacci_sequence.length - 1)));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;
};
var unbt_skein={};

function bitnodes(){
//https://bitnodes.io/dashboard/
const bitcoin= require('bitcoin');
const fs= ('node:fs');

fetch('https://bitnodes.io/api/v1/snapshots/latest/')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));  
}
bitnodes();sequence();amazing();


module.exports= unbt_skein;

/*
Gekko M4 The MIT License (MIT) Copyright (c) 2024 UniversalBit BlockChain

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. https://en.wikipedia.org/wiki/MIT_License
*/
