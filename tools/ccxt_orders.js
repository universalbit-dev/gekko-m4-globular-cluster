/**
 * ccxt_orders.js
 * 
 * Unified signal processing and specialized bullish trading strategy implementation.
 * 
 * Features:
 * 1. Unifies signals from ccxt_signal.log and ccxt_signal_magnitude.log
 * 2. Implements specialized bullish strategy (only long positions)
 * 3. Logs all orders to ccxt_order.log
 * 4. Runs at configured intervals with overlap protection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const SIGNAL_MAGNITUDE_LOG_PATH = path.join(__dirname, './ccxt_signal_magnitude.log');
const ORDER_LOG_PATH = path.join(__dirname, './ccxt_order.log');

// Default interval: 1 hour (can be overridden by environment variable)
const INTERVAL_MS = process.env.CCXT_ORDERS_INTERVAL_MS ? 
  parseInt(process.env.CCXT_ORDERS_INTERVAL_MS) : 
  60 * 60 * 1000; // 1 hour

// Thresholds for weak_bull detection
const WEAK_BULL_PVVM_THRESHOLD = parseFloat(process.env.WEAK_BULL_PVVM_THRESHOLD) || 1.0;
const WEAK_BULL_PVD_THRESHOLD = parseFloat(process.env.WEAK_BULL_PVD_THRESHOLD) || 1.0;

// Global state
let isProcessing = false;
let positionOpen = false;
let processedSignals = new Set();

/**
 * Ensures the directory for a file path exists
 */
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Logs an order to the order log file
 */
function logOrder(timestamp, prediction, type, details = '') {
  ensureDirectoryExists(ORDER_LOG_PATH);
  
  const logEntry = `${timestamp}\t${prediction}\t${type}\t${details}\n`;
  
  try {
    fs.appendFileSync(ORDER_LOG_PATH, logEntry);
    console.log(`[${new Date().toISOString()}] Order logged: ${type} - ${prediction} - ${details}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to log order:`, error.message);
  }
}

/**
 * Parses a signal log file and returns an array of signal objects
 */
function parseSignalLog(filePath, hasExtendedFormat = false) {
  if (!fs.existsSync(filePath)) {
    console.log(`Signal log not found: ${filePath}`);
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return [];

    const lines = content.split('\n');
    const signals = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Skip header lines
      if (line.includes('timestamp\t') && line.includes('prediction')) {
        continue;
      }

      const parts = line.split('\t');
      
      if (hasExtendedFormat) {
        // Format: timestamp\tprediction\tprice\tPVVM\tPVD\tlabel
        if (parts.length >= 6) {
          signals.push({
            timestamp: parts[0],
            prediction: parts[1],
            price: parseFloat(parts[2]) || 0,
            PVVM: parseFloat(parts[3]) || 0,
            PVD: parseFloat(parts[4]) || 0,
            label: parts[5],
            source: 'magnitude'
          });
        }
      } else {
        // Format: timestamp\tprediction
        if (parts.length >= 2) {
          signals.push({
            timestamp: parts[0],
            prediction: parts[1],
            price: 0,
            PVVM: 0,
            PVD: 0,
            label: parts[1], // Use prediction as label for basic signals
            source: 'basic'
          });
        }
      }
    }

    return signals;
  } catch (error) {
    console.error(`Error parsing signal log ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Unifies signals from both log files, preferring magnitude log entries
 */
function unifySignals() {
  const basicSignals = parseSignalLog(SIGNAL_LOG_PATH, false);
  const magnitudeSignals = parseSignalLog(SIGNAL_MAGNITUDE_LOG_PATH, true);
  
  // Create a map with timestamp as key, prefer magnitude signals
  const signalMap = new Map();
  
  // Add basic signals first
  basicSignals.forEach(signal => {
    signalMap.set(signal.timestamp, signal);
  });
  
  // Override with magnitude signals (preferred)
  magnitudeSignals.forEach(signal => {
    signalMap.set(signal.timestamp, signal);
  });
  
  // Convert back to array and sort chronologically
  const unifiedSignals = Array.from(signalMap.values())
    .sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return aTime - bTime;
    });
  
  console.log(`Unified ${unifiedSignals.length} signals (${basicSignals.length} basic, ${magnitudeSignals.length} magnitude)`);
  return unifiedSignals;
}

/**
 * Creates a unique key for a signal to avoid duplicate processing
 */
function createSignalKey(signal) {
  const keyString = `${signal.timestamp}_${signal.prediction}_${signal.label}`;
  return crypto.createHash('md5').update(keyString).digest('hex');
}

/**
 * Determines if a weak_bull signal should trigger a sell (close position)
 */
function shouldCloseBullPosition(signal) {
  if (signal.label !== 'weak_bull') {
    return false;
  }
  
  // Check if both PVVM and PVD are close to zero
  return signal.PVVM < WEAK_BULL_PVVM_THRESHOLD && signal.PVD < WEAK_BULL_PVD_THRESHOLD;
}

/**
 * Implements the specialized bullish strategy
 */
function processSignal(signal) {
  const signalKey = createSignalKey(signal);
  
  // Skip if already processed
  if (processedSignals.has(signalKey)) {
    return;
  }
  
  processedSignals.add(signalKey);
  
  const { timestamp, prediction, label, price, PVVM, PVD } = signal;
  
  // Strategy Logic: Specialized Bullish
  if (!positionOpen) {
    // Only open long positions on bull or strong_bull signals
    if (prediction === 'bull' || label === 'bull' || label === 'strong_bull') {
      positionOpen = true;
      logOrder(timestamp, prediction, 'BUY', `Opened long position. Price: ${price}, Label: ${label}, PVVM: ${PVVM}, PVD: ${PVD}`);
      return;
    }
  } else {
    // Position is open - check for close conditions
    if (shouldCloseBullPosition(signal)) {
      positionOpen = false;
      logOrder(timestamp, prediction, 'SELL', `Closed long position on weak_bull. Price: ${price}, PVVM: ${PVVM}, PVD: ${PVD}`);
      return;
    }
  }
  
  // Log idle state for transparency
  const positionStatus = positionOpen ? 'position open' : 'no position';
  logOrder(timestamp, prediction, 'IDLE', `No action taken. Label: ${label}, ${positionStatus}, Price: ${price}`);
}

/**
 * Main signal processing function
 */
function processSignals() {
  if (isProcessing) {
    console.log(`[${new Date().toISOString()}] Previous signal processing cycle still running, skipping...`);
    return;
  }
  
  isProcessing = true;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting signal processing cycle...`);
    
    const unifiedSignals = unifySignals();
    
    if (unifiedSignals.length === 0) {
      console.log('No signals to process');
      logOrder(new Date().toISOString(), 'none', 'IDLE', 'No signals available');
      return;
    }
    
    // Process each signal in chronological order
    unifiedSignals.forEach(signal => {
      try {
        processSignal(signal);
      } catch (error) {
        console.error(`Error processing signal:`, error.message);
        logOrder(signal.timestamp, signal.prediction, 'IDLE', `Error: ${error.message}`);
      }
    });
    
    console.log(`[${new Date().toISOString()}] Signal processing cycle completed. Position: ${positionOpen ? 'OPEN' : 'CLOSED'}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in signal processing:`, error.message);
    logOrder(new Date().toISOString(), 'error', 'IDLE', `Processing error: ${error.message}`);
  } finally {
    isProcessing = false;
  }
}

/**
 * Initialize the order processor
 */
function initialize() {
  console.log(`[${new Date().toISOString()}] Initializing CCXT Orders Processor...`);
  console.log(`Interval: ${INTERVAL_MS}ms (${INTERVAL_MS / 1000 / 60} minutes)`);
  console.log(`Weak Bull Thresholds - PVVM: ${WEAK_BULL_PVVM_THRESHOLD}, PVD: ${WEAK_BULL_PVD_THRESHOLD}`);
  console.log(`Signal logs: ${SIGNAL_LOG_PATH}, ${SIGNAL_MAGNITUDE_LOG_PATH}`);
  console.log(`Order log: ${ORDER_LOG_PATH}`);
  
  // Ensure order log exists with header
  ensureDirectoryExists(ORDER_LOG_PATH);
  if (!fs.existsSync(ORDER_LOG_PATH)) {
    fs.writeFileSync(ORDER_LOG_PATH, 'timestamp\tprediction\ttype\tdetails\n');
  }
  
  // Log initialization
  logOrder(new Date().toISOString(), 'init', 'IDLE', 'CCXT Orders Processor initialized');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...`);
  logOrder(new Date().toISOString(), 'shutdown', 'IDLE', 'CCXT Orders Processor shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...`);
  logOrder(new Date().toISOString(), 'shutdown', 'IDLE', 'CCXT Orders Processor shutting down');
  process.exit(0);
});

// Initialize and start processing
initialize();

// Run initial processing
processSignals();

// Set up interval processing
setInterval(processSignals, INTERVAL_MS);

console.log(`[${new Date().toISOString()}] CCXT Orders Processor is running...`);