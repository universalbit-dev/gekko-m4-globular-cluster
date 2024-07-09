//https://bitnodes.io/dashboard/
const bitcoin= require('bitcoin');
const fs= ('node:fs');

fetch('https://bitnodes.io/api/v1/snapshots/latest/')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));


