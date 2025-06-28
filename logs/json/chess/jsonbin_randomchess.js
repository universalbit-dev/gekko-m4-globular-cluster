/**
 * jsonbin_randomchess.js
 * 
 * Scheduled uploader for filtered chess log JSON to jsonbin.io
 * 
 * Description:
 * Designed to work with the pipeline:
 *  1. pm2 logs --json | node realTimeChessProcessor.js
 *   
 * - This script, jsonbin_randomchess.js, reads 'randomchess.json' and uploads it to jsonbin.io every hour.
 * 
 * About jsonbin.io:
 * - jsonbin.io is a web service for storing, retrieving, and managing JSON data in the cloud via a simple HTTP API.
 * 
 * Usage:
 * Obtain your jsonbin.io access key and set it in the 'X-Access-Key' variable below.
 *
 * Ensure 'randomchess.json' is generated and updated by your log processing pipeline.
 * 1. pm2 logs --json | node realTimeChessProcessor.js
 * Run the script:
 * 2. node jsonbin_randomchess.js
 * 
 * The script will stay running and will automatically upload the file every hour.
 * 
 * Note:
 *   This script is scheduled for reliable, periodic uploads, providing a safe time margin to accommodate data processing.
 * 
 * Author: universalbit-dev
 * Date:   02-06-2025
 */
 
const fetch = require('node-fetch');
const fs = require('fs-extra');
const cron = require('node-cron');

const accessKey = ''; //<== Your jsonbin.io X-Access-Key
if (!accessKey || accessKey.trim() === '') {
  console.error('Error: X-Access-Key is not set. Please provide your jsonbin.io X-Access-Key in the accessKey variable.');
  process.exit(1);
}

// Schedule the task to run at the start of every hour
cron.schedule('0 * * * *', () => {
  console.log('Running upload task:', new Date().toLocaleString());
  const data = fs.readFileSync('randomchess.json', 'utf8');

  fetch('https://api.jsonbin.io/v3/b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': accessKey,
      'X-Bin-Private': 'true',
    },
    body: data
  })
  .then(res => res.json())
  .then(json => {
    console.log('Upload successful:', json);
  })
  .catch(error => {
    console.error('Upload failed:', error);
  });
});

// Keep the script running
console.log('Cron job scheduled. Waiting for next run...');
 
 

