const fs = require('fs-extra');

const outputFile = 'simulator.json';
let buffer = '';

// Check if the file already exists and read its content
let logs = [];
if (fs.existsSync(outputFile)) {
  try {
    logs = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  } catch (err) {
    console.error('Error parsing existing JSON file:', err.message);
  }
}

// Process incoming data from PM2 logs
process.stdin.on('data', (chunk) => {
  buffer += chunk;

  // Split the buffer into lines
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep the incomplete line in the buffer

  lines.forEach((line) => {
    if (line.trim() !== '') {
      try {
        const logEntry = JSON.parse(line); // Parse the JSON log entry
        logs.push(logEntry); // Add to the logs array

        // Write updated logs array back to the file
        fs.writeFileSync(outputFile, JSON.stringify(logs, null, 2));
      } catch (err) {
        console.error('Failed to parse log entry:', err.message);
      }
    }
  });
});
