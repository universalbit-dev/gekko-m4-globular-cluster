/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var seqms = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)];

var sequence = ms => new Promise(resolve => setTimeout(resolve, seqms));
async function sequence() {await sequence;};


async function bitnodes(){
//https://bitnodes.io/dashboard/
const bitcoin= require('bitcoin');
const fs= ('node:fs');

  fetch('https://bitnodes.io/api/v1/snapshots/latest/')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
}

bitnodes();sequence();

