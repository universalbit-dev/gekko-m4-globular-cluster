/**
 * pm2-cpu-watchdog.js (CPU & MEMORY optimized) summer version
 *
 * Monitors specified PM2 processes for sustained high CPU or MEMORY usage,
 * and restarts them if usage exceeds configurable thresholds for a configurable duration.
 *
 * Usage:
 *   1. Set the process names you wish to monitor in the `monitoredNames` array below.
 *   2. Adjust the CPU & MEMORY thresholds (%/MB), monitoring interval (seconds), and duration thresholds (seconds) as needed.
 *   3. Start this script with PM2 to ensure the watchdog itself stays running:
 *        pm2 start pm2-cpu-watchdog.js --name pm2-cpu-watchdog
 *
 * Requirements:
 *   - PM2 must be installed globally (`npm install -g pm2`)
 *   - This script should run on the same server as your PM2 processes.
 *
 * Example:
 *   If a process uses more than 100% CPU for over 2 minutes,
 *   or more than 400MB RAM for over 2 minutes, it will be automatically restarted.
 *
 * Author: universalbit-dev
 */

const pm2 = require('pm2');

// CPU config
const CPU_THRESHOLD = 100; // percent CPU usage to trigger restart
const CPU_DURATION_THRESHOLD = 120; // seconds CPU usage must remain above threshold before restart

// MEMORY config
const MEMORY_THRESHOLD_MB = 400; // MB RAM to trigger restart
const MEMORY_DURATION_THRESHOLD = 120; // seconds memory must remain above threshold before restart

const CHECK_INTERVAL = 10; // seconds between checks

const monitoredNames = [
  'ccxt_orders',
  'challenge_analysis',
  'challenge_log_writer',
  'chart_ccxt_recognition',
  'chart_ccxt_recognition_magnitude',
  'chart_recognition',
  'label_ohlcv',
  'pm2-tools-watchdog',
  'tools.config',
  'train_ccxt_ohlcv',
  'train_ccxt_ohlcv_tf',
  'train_ohlcv',
  'neuralnet_simulator',
  'grafana_neuralnet',
  'cci_simulator',
  'grafana_cci',
  'dema_simulator',
  'grafana_dema',
  'rsibullbearadx_simulator',
  'grafana_rsibullbearadx',
  'bollingerband_simulator',
  'grafana_bollingerband',
  'noop_simulator',
  'grafana_noop',
  'neuralnet_refinements_simulator',
  'grafana_neuralnet_refinements',
  'csvexport',
  'ohlcv_data',
  'realTimeChess',
  'randomchess'
];
// Use Maps for tracking threshold breaches
const highCpuSince = new Map();
const highMemSince = new Map();

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

        // CPU monitoring
        if (proc.monit.cpu > CPU_THRESHOLD) {
          if (!highCpuSince.has(proc.name)) highCpuSince.set(proc.name, now);
          const cpuDuration = (now - highCpuSince.get(proc.name)) / 1000;
          if (cpuDuration > CPU_DURATION_THRESHOLD) {
            pm2.restart(proc.pm_id, err => {
              if (err) console.error('Restart failed:', err);
              else console.log(`Restarted ${proc.name} due to sustained high CPU usage.`);
              highCpuSince.delete(proc.name);
              highMemSince.delete(proc.name); // Reset mem tracking too
            });
          }
        } else {
          highCpuSince.delete(proc.name);
        }

        // MEMORY monitoring
        const memMB = proc.monit.memory / (1024 * 1024);
        if (memMB > MEMORY_THRESHOLD_MB) {
          if (!highMemSince.has(proc.name)) highMemSince.set(proc.name, now);
          const memDuration = (now - highMemSince.get(proc.name)) / 1000;
          if (memDuration > MEMORY_DURATION_THRESHOLD) {
            pm2.restart(proc.pm_id, err => {
              if (err) console.error('Restart failed:', err);
              else console.log(`Restarted ${proc.name} due to sustained high MEMORY usage (${memMB.toFixed(1)} MB).`);
              highMemSince.delete(proc.name);
              highCpuSince.delete(proc.name); // Reset cpu tracking too
            });
          }
        } else {
          highMemSince.delete(proc.name);
        }
      });

      // Clean up process names that no longer exist
      for (const name of Array.from(highCpuSince.keys())) {
        if (!list.some(proc => proc.name === name)) {
          highCpuSince.delete(name);
        }
      }
      for (const name of Array.from(highMemSince.keys())) {
        if (!list.some(proc => proc.name === name)) {
          highMemSince.delete(name);
        }
      }
      pm2.disconnect();
    });
  });
}

const interval = setInterval(check, CHECK_INTERVAL * 1000);

// Optional: Clean shutdown (avoid leaks on exit)
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
