/**
 * pm2-cpu-watchdog.js
 *
 * Monitors specified PM2 processes for sustained high CPU usage, and restarts them if CPU usage
 * exceeds a configurable threshold for a configurable duration.
 *
 * Usage:
 *   1. Set the process names you wish to monitor in the `monitoredNames` array below.
 *   2. Adjust the CPU threshold (%), monitoring interval (seconds), and duration threshold (seconds) as needed.
 *   3. Start this script with PM2 to ensure the watchdog itself stays running:
 *        pm2 start pm2-cpu-watchdog.js --name pm2-cpu-watchdog
 *
 * Requirements:
 *   - PM2 must be installed globally (`npm install -g pm2`)
 *   - This script should run on the same server as your PM2 processes.
 *
 * Example:
 *   If a process named 'neuralnet_simulator' uses more than 100% CPU for over 2 minutes,
 *   it will be automatically restarted.
 *
 * Author: universalbit-dev
 */

const pm2 = require('pm2');
const CPU_THRESHOLD = 100;// percent CPU usage to trigger restart
const DURATION_THRESHOLD = 120;// seconds CPU usage must remain above threshold before restart
const CHECK_INTERVAL = 10;// seconds between checks

const monitoredNames = [
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
  'ohlcv_data'
];

let highCpuSince = {};

function check() {
  pm2.connect(err => {
    if (err) return console.error(err);
    pm2.list((err, list) => {
      if (err) return console.error(err);
      const now = Date.now();
      list.forEach(proc => {
        if (!monitoredNames.includes(proc.name)) return;
        if (proc.monit.cpu > CPU_THRESHOLD) {
          if (!highCpuSince[proc.name]) highCpuSince[proc.name] = now;
          const duration = (now - highCpuSince[proc.name]) / 1000;
          if (duration > DURATION_THRESHOLD) {
            pm2.restart(proc.pm_id, err => {
              if (err) console.error('Restart failed:', err);
              else console.log(`Restarted ${proc.name} due to sustained high CPU usage.`);
              highCpuSince[proc.name] = undefined;
            });
          }
        } else {
          highCpuSince[proc.name] = undefined;
        }
      });
      pm2.disconnect();
    });
  });
}

setInterval(check, CHECK_INTERVAL * 1000);
