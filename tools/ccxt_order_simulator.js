/**
 * ccxt_order_simulator.js
 * 
 * Backtesting script for trading signals from ccxt_signal.log
 * 
 * Reads signal log containing lines formatted as: timestamp<tab>prediction<tab>price
 * Simulates buy/sell/idle actions based on predictions:
 * - 'bull' = buy action
 * - 'bear' = sell action  
 * - 'idle' = no action
 * 
 * Tracks balances, calculates PnL, and annotates prediction success.
 * Outputs results to order.log in CSV format.
 * 
 * Author: universalbit-dev
 * Date: 2025-06-26
 */

const fs = require('fs');
const path = require('path');

// Configuration constants
const SIGNAL_LOG_PATH = path.join(__dirname, 'ccxt_signal.log');
const ORDER_LOG_PATH = path.join(__dirname, 'order.log');
const INITIAL_BASE_BALANCE = 1.0;  // Base asset (e.g., BTC)
const INITIAL_QUOTE_BALANCE = 10000.0;  // Quote asset (e.g., USD)
const ORDER_AMOUNT = 0.1;  // Fixed order amount in base asset

/**
 * Ensures the directory for a file path exists
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Parses a signal log line and returns structured data
 * Expected format: timestamp<tab>prediction<tab>price
 */
function parseSignalLine(line) {
  if (!line || !line.trim()) return null;
  
  const parts = line.trim().split('\t');
  if (parts.length !== 3) return null;
  
  const [timestamp, prediction, priceStr] = parts;
  const price = parseFloat(priceStr);
  
  if (!timestamp || !prediction || isNaN(price) || price <= 0) {
    return null;
  }
  
  return {
    timestamp: timestamp.trim(),
    prediction: prediction.trim().toLowerCase(),
    price: price
  };
}

/**
 * Determines the action based on prediction
 */
function getAction(prediction) {
  switch (prediction) {
    case 'bull': return 'buy';
    case 'bear': return 'sell';
    case 'idle': return 'idle';
    default: return 'idle';
  }
}

/**
 * Calculates success of a prediction based on next price
 */
function calculateSuccess(action, currentPrice, nextPrice) {
  if (action === 'idle') return '';
  if (nextPrice === null || nextPrice === undefined) return '';
  
  if (action === 'buy') {
    return nextPrice > currentPrice ? 'success' : 'fail';
  } else if (action === 'sell') {
    return nextPrice < currentPrice ? 'success' : 'fail';
  }
  
  return '';
}

/**
 * Simulates order execution and updates balances
 */
function executeOrder(action, price, baseBalance, quoteBalance) {
  let newBaseBalance = baseBalance;
  let newQuoteBalance = quoteBalance;
  let pnl = 0;
  let orderExecuted = false;
  
  if (action === 'buy' && quoteBalance >= ORDER_AMOUNT * price) {
    // Buy ORDER_AMOUNT of base asset
    newBaseBalance += ORDER_AMOUNT;
    newQuoteBalance -= ORDER_AMOUNT * price;
    orderExecuted = true;
  } else if (action === 'sell' && baseBalance >= ORDER_AMOUNT) {
    // Sell ORDER_AMOUNT of base asset
    newBaseBalance -= ORDER_AMOUNT;
    newQuoteBalance += ORDER_AMOUNT * price;
    orderExecuted = true;
  }
  
  return {
    baseBalance: newBaseBalance,
    quoteBalance: newQuoteBalance,
    pnl: pnl,
    orderExecuted: orderExecuted
  };
}

/**
 * Calculates realized PnL for sell orders based on last buy price
 */
function calculatePnL(action, price, lastBuyPrice, orderExecuted) {
  if (action === 'sell' && orderExecuted && lastBuyPrice !== null) {
    return (price - lastBuyPrice) * ORDER_AMOUNT;
  }
  return 0;
}

/**
 * Formats number to specified decimal places
 */
function formatNumber(num, decimals = 6) {
  return Number(num.toFixed(decimals));
}

/**
 * Main simulation function
 */
function runSimulation() {
  console.log('CCXT Order Simulator');
  console.log('===================');
  
  // Check if signal log exists
  if (!fs.existsSync(SIGNAL_LOG_PATH)) {
    console.error(`Error: Signal log not found at ${SIGNAL_LOG_PATH}`);
    console.log('Please ensure ccxt_signal.log exists with the format:');
    console.log('timestamp<tab>prediction<tab>price');
    return;
  }
  
  // Read and parse signal log
  const signalData = fs.readFileSync(SIGNAL_LOG_PATH, 'utf8');
  const lines = signalData.trim().split('\n');
  
  if (lines.length === 0) {
    console.error('Error: Signal log is empty');
    return;
  }
  
  // Parse signals
  const signals = [];
  let malformedLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseSignalLine(lines[i]);
    if (parsed) {
      signals.push(parsed);
    } else if (lines[i].trim()) {
      malformedLines++;
      console.warn(`Warning: Malformed line ${i + 1}: "${lines[i].trim()}"`);
    }
  }
  
  if (signals.length === 0) {
    console.error('Error: No valid signals found in log');
    return;
  }
  
  console.log(`Loaded ${signals.length} valid signals (${malformedLines} malformed lines skipped)`);
  
  // Initialize simulation state
  let baseBalance = INITIAL_BASE_BALANCE;
  let quoteBalance = INITIAL_QUOTE_BALANCE;
  let lastBuyPrice = null;
  let totalRealizedPnL = 0;
  const results = [];
  
  // Clear order log
  ensureDir(ORDER_LOG_PATH);
  const csvHeader = 'timestamp,order,price,balance,pnl,success\n';
  fs.writeFileSync(ORDER_LOG_PATH, csvHeader);
  
  console.log('\nStarting simulation...');
  console.log(`Initial balance: ${formatNumber(baseBalance)} base, ${formatNumber(quoteBalance)} quote`);
  
  // Process each signal
  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    const action = getAction(signal.prediction);
    const nextSignal = i < signals.length - 1 ? signals[i + 1] : null;
    const nextPrice = nextSignal ? nextSignal.price : null;
    
    // Execute order
    const orderResult = executeOrder(action, signal.price, baseBalance, quoteBalance);
    baseBalance = orderResult.baseBalance;
    quoteBalance = orderResult.quoteBalance;
    
    // Calculate PnL for sell orders
    let pnl = 0;
    if (action === 'sell' && orderResult.orderExecuted) {
      pnl = calculatePnL(action, signal.price, lastBuyPrice, orderResult.orderExecuted);
      totalRealizedPnL += pnl;
    }
    
    // Update last buy price
    if (action === 'buy' && orderResult.orderExecuted) {
      lastBuyPrice = signal.price;
    }
    
    // Calculate prediction success
    const success = calculateSuccess(action, signal.price, nextPrice);
    
    // Calculate total balance in quote currency
    const totalBalance = quoteBalance + (baseBalance * signal.price);
    
    // Record result
    const result = {
      timestamp: signal.timestamp,
      order: orderResult.orderExecuted ? action : 'idle',
      price: formatNumber(signal.price),
      balance: formatNumber(totalBalance),
      pnl: formatNumber(pnl),
      success: success
    };
    
    results.push(result);
    
    // Append to CSV
    const csvLine = `${result.timestamp},${result.order},${result.price},${result.balance},${result.pnl},${result.success}\n`;
    fs.appendFileSync(ORDER_LOG_PATH, csvLine);
  }
  
  // Calculate final statistics
  const finalTotalBalance = quoteBalance + (baseBalance * signals[signals.length - 1].price);
  const initialTotalBalance = INITIAL_QUOTE_BALANCE + (INITIAL_BASE_BALANCE * signals[0].price);
  const totalPnL = finalTotalBalance - initialTotalBalance;
  const totalPnLPercent = (totalPnL / initialTotalBalance) * 100;
  
  const successfulPredictions = results.filter(r => r.success === 'success').length;
  const failedPredictions = results.filter(r => r.success === 'fail').length;
  const totalPredictions = successfulPredictions + failedPredictions;
  const successRate = totalPredictions > 0 ? (successfulPredictions / totalPredictions) * 100 : 0;
  
  const executedOrders = results.filter(r => r.order !== 'idle').length;
  const buyOrders = results.filter(r => r.order === 'buy').length;
  const sellOrders = results.filter(r => r.order === 'sell').length;
  
  // Display results
  console.log('\nSimulation completed!');
  console.log('===================');
  console.log(`Final balance: ${formatNumber(baseBalance)} base, ${formatNumber(quoteBalance)} quote`);
  console.log(`Total balance: ${formatNumber(finalTotalBalance)} quote`);
  console.log(`Total PnL: ${formatNumber(totalPnL)} (${formatNumber(totalPnLPercent)}%)`);
  console.log(`Realized PnL: ${formatNumber(totalRealizedPnL)}`);
  console.log(`Orders executed: ${executedOrders} (${buyOrders} buy, ${sellOrders} sell)`);
  console.log(`Prediction accuracy: ${successfulPredictions}/${totalPredictions} (${formatNumber(successRate)}%)`);
  console.log(`Results written to: ${ORDER_LOG_PATH}`);
  
  return {
    finalBalance: finalTotalBalance,
    totalPnL: totalPnL,
    successRate: successRate,
    ordersExecuted: executedOrders
  };
}

// CLI usage
if (require.main === module) {
  try {
    runSimulation();
  } catch (error) {
    console.error('Simulation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { runSimulation, parseSignalLine, getAction, calculateSuccess };