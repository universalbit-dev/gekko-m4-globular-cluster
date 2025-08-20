/**
 * pm2-tools-watchdog.js (summer version)
 *
 * Monitors specific "tools" PM2 processes for high CPU usage and restarts them if needed.
 * Designed for use with tools.config.js ecosystem.
 *
 * How to use:
 *   1. Add this script to your tools directory.
 *   2. Add an entry for this script in your tools.config.js (see below).
 *   3. Start with: pm2 start tools.config.js
 */

const pm2 = require('pm2');
const CPU_THRESHOLD = 100;      // CPU % usage to trigger restart
const DURATION_THRESHOLD = 120; // seconds CPU must be above threshold
const CHECK_INTERVAL = 10;      // seconds between checks

const monitoredNames = [
  'ccxt_orders',
  'challenge_analysis',
  'challenge_log_writer',
  'chart_ccxt_recognition',
  'chart_ccxt_recognition_magnitude',
  'chart_recognition',
  'label_ohlcv',
  'train_ccxt_ohlcv',
  'train_ccxt_ohlcv_tf',
  'train_ohlcv'
];

const highCpuSince = new Map();

function check() {
  pm2.connect(err => {
    if (err) return console.error(err);
    pm2.list((err, list) => {
      if (err) {
        pm2.disconnect();
        return console.error(err);
      }
      const now = Date.now();
      list.forEach(proc => {
        if (!monitoredNames.includes(proc.name)) return;
        if (proc.monit.cpu > CPU_THRESHOLD) {
          if (!highCpuSince.has(proc.name)) highCpuSince.set(proc.name, now);
          const duration = (now - highCpuSince.get(proc.name)) / 1000;
          if (duration > DURATION_THRESHOLD) {
            pm2.restart(proc.pm_id, err => {
              if (err) console.error(`Restart failed for ${proc.name}:`, err);
              else console.log(`[Watchdog] Restarted ${proc.name} due to sustained high CPU usage.`);
              highCpuSince.delete(proc.name);
            });
          }
        } else {
          highCpuSince.delete(proc.name);
        }
      });
      // Clean up old process names
      for (const name of Array.from(highCpuSince.keys())) {
        if (!list.some(proc => proc.name === name)) {
          highCpuSince.delete(name);
        }
      }
      pm2.disconnect();
    });
  });
}

const interval = setInterval(check, CHECK_INTERVAL * 1000);

// Clean shutdown
process.on('SIGINT', () => {
  clearInterval(interval);
  pm2.disconnect();
  process.exit(0);
});
process.on('SIGTERM', () => {
  clearInterval(interval);
  pm2.disconnect();
  process.exit(0);
});
