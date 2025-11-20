// Lightweight FIFO P&L utilities for microstructure
// Usage: const { computePositionAndPnl } = require('./micro_pnl');
// trades: array of { when, action: 'BUY'|'SELL', price, amount, simulated?, orderId?, fee? }
// currentPrice: market price to mark open positions
// opts: { feeRate: 0.001, feeIsPercent: true } // default 0.1% per trade if fee not provided in trade objects
//
// The code matches sells against earlier buys (FIFO) and accumulates realized P&L.
// Fees can be provided on each trade as trade.fee (absolute in quote currency), or a global feeRate (%) will be used as fallback.
// Returns:
// {
//   position: { amount: <base net>, side: 'long'|'flat'|'short', avgEntry: <price|null> },
//   realized: <quote currency>,
//   unrealized: <quote currency>,
//   fees: <quote currency total>
// }

function safeNum(v) { return (v === undefined || v === null || Number.isNaN(Number(v))) ? 0 : Number(v); }

function computePositionAndPnl(trades, currentPrice, opts = {}) {
  const feeRate = typeof opts.feeRate === 'number' ? opts.feeRate : 0.001; // default 0.1%
  const feeIsPercent = opts.feeIsPercent !== undefined ? !!opts.feeIsPercent : true;

  // Ensure trades sorted by time ascending
  const txs = (Array.isArray(trades) ? trades.slice() : []).sort((a, b) => (a.when || a.timestamp || 0) - (b.when || b.timestamp || 0));

  // FIFO buy lots queue: { qty, price, feePaid }
  const buys = [];
  let realized = 0;
  let totalFees = 0;

  for (const t of txs) {
    const action = String(t.action || t.side || '').toUpperCase();
    const price = safeNum(t.price);
    const amount = safeNum(t.amount);

    // Determine fee for this trade (in quote currency)
    let tradeFee = 0;
    if (t.fee !== undefined && t.fee !== null) {
      tradeFee = safeNum(t.fee);
    } else if (feeIsPercent && price && amount) {
      tradeFee = feeRate * price * amount;
    } else if (!feeIsPercent && typeof feeRate === 'number') {
      tradeFee = feeRate; // treat feeRate as absolute fallback
    }

    totalFees += tradeFee;

    if (action === 'BUY') {
      // push buy lot
      buys.push({ qty: amount, price, fee: tradeFee });
      continue;
    }

    if (action === 'SELL') {
      let remaining = amount;
      // match sell against oldest buys
      while (remaining > 0 && buys.length > 0) {
        const lot = buys[0];
        const matched = Math.min(remaining, lot.qty);
        const buyCost = lot.price * matched;
        const sellProceeds = price * matched;

        // fees: include proportional portion of buy fee (if present) + proportional portion of this sell's fee
        const buyFeePortion = lot.fee ? (lot.fee * (matched / lot.qty)) : 0;
        const sellFeePortion = tradeFee ? (tradeFee * (matched / amount)) : 0;
        const feesForMatch = buyFeePortion + sellFeePortion;

        const pnl = sellProceeds - buyCost - feesForMatch;
        realized += pnl;

        // reduce lot
        lot.qty = +(lot.qty - matched).toFixed(12);
        if (lot.qty <= 0.00000001) buys.shift();

        remaining = +(remaining - matched).toFixed(12);
      }

      // if sells exceed buys (net short), treat unmatched sells as opening a short with zero-cost basis (user may want different accounting)
      if (remaining > 0) {
        const sellProceeds = price * remaining;
        const sellFeePortion = tradeFee ? (tradeFee * (remaining / amount)) : 0;
        realized += (sellProceeds - sellFeePortion);
        // record negative lot to keep position balance correct
        buys.unshift({ qty: -remaining, price, fee: -sellFeePortion });
      }
    }
  }

  // compute current open position (sum of buy lots)
  let netQty = buys.reduce((s, b) => s + (b.qty || 0), 0);
  netQty = +netQty.toFixed(12);
  const position = { amount: netQty, side: 'flat', avgEntry: null };

  if (Math.abs(netQty) > 0.00000001) {
    position.side = netQty > 0 ? 'long' : 'short';
    // compute weighted avg entry for longs only (for shorts the interpretation differs)
    const totalCost = buys.reduce((s, b) => s + (Math.max(0, b.qty) * b.price), 0);
    const totalQty = buys.reduce((s, b) => s + Math.max(0, b.qty), 0);
    position.avgEntry = totalQty > 0 ? (totalCost / totalQty) : null;
  }

  // Unrealized: mark net position at currentPrice
  let unrealized = 0;
  if (Math.abs(netQty) > 0.00000001 && currentPrice) {
    if (position.avgEntry !== null) {
      unrealized = (currentPrice - position.avgEntry) * netQty;
    } else if (netQty < 0) {
      // short: profit if price dropped (simple interpretation)
      unrealized = (position.avgEntry !== null) ? (position.avgEntry - currentPrice) * Math.abs(netQty) : 0;
    }
  }

  return {
    position,
    realized: +realized.toFixed(8),
    unrealized: +unrealized.toFixed(8),
    fees: +totalFees.toFixed(8)
  };
}

module.exports = { computePositionAndPnl };
