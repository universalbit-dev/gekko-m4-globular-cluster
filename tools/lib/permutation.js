'use strict';
/**
 * tools/lib/permutation.js - enhanced
 *
 * Responsibilities:
 * - Enumerate reasonable limit/stop/stopLimit plan permutations given a candidate price, side, amount and profile
 * - Format plans to market precision (price/amount tick/precision handling)
 * - Prune infeasible plans (min amount, price bounds, minimal TP/SL distance)
 * - Score plans using heuristics (maker/taker preference, expected absolute profit, reward:risk, proximity to book)
 * - Pick best plan and return all formatted candidates
 *
 * Notes:
 * - Exchange-agnostic: expects a market object with possible properties:
 *     market.precision.price (integer), market.precision.amount (integer),
 *     market.limits.price.min/max, market.limits.amount.min/max
 * - Optional ctx.orderbook can be used to improve scoring heuristics; expects standard [ [price, amount], ... ] arrays.
 * - Exported helpers: formatPriceToPrecision, formatAmountToPrecision, computeTpSl (useful for runner tests)
 */

const crypto = require('crypto');

function makeId(prefix = 'plan') {
  // deterministic-like id (time + random) for traceability
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ---------- TP/SL helper ---------- */
function computeTpSl(price, side, profile = {}) {
  const profit_pct = (typeof profile.profit_pct === 'number') ? profile.profit_pct : (profile.profit || 0.005);
  const loss_pct = (typeof profile.loss_pct === 'number') ? profile.loss_pct : (profile.loss || 0.002);
  const p = Number(price);
  if (!Number.isFinite(p)) return { tp: null, sl: null };
  if (side === 'sell' || side === 'short') {
    // For shorts: profit is price * (1 - profit_pct) ; stop is price * (1 + loss_pct)
    return { tp: p * (1 - profit_pct), sl: p * (1 + loss_pct) };
  }
  // buy
  return { tp: p * (1 + profit_pct), sl: p * (1 - loss_pct) };
}

/* ---------- Market helpers (small, self-contained) ---------- */
function marketTick(market) {
  if (!market) return 1e-8;
  if (market.precision && Number.isInteger(market.precision.price)) return Math.pow(10, -market.precision.price);
  if (market.limits && market.limits.price && Number.isFinite(Number(market.limits.price.min)) && Number(market.limits.price.min) > 0) {
    return Number(market.limits.price.min);
  }
  return 1e-8;
}
function pricePrecision(market) {
  if (!market) return 8;
  if (market.precision && Number.isInteger(market.precision.price)) return market.precision.price;
  if (market.limits && market.limits.price && Number.isFinite(Number(market.limits.price.min)) && market.limits.price.min > 0) {
    const decimals = Math.max(0, Math.ceil(-Math.log10(Number(market.limits.price.min))));
    return decimals;
  }
  return 8;
}
function amountPrecision(market) {
  if (!market) return 8;
  if (market.precision && Number.isInteger(market.precision.amount)) return market.precision.amount;
  return 8;
}

function formatPriceToPrecision(price, market) {
  if (price === null || price === undefined) return price;
  const p = Number(price);
  if (!isFinite(p)) return price;
  const pp = pricePrecision(market);
  const factor = Math.pow(10, pp);
  return Number((Math.round(p * factor) / factor).toFixed(pp));
}
function formatAmountToPrecision(amount, market) {
  if (amount === null || amount === undefined) return amount;
  const a = Number(amount);
  if (!isFinite(a)) return amount;
  const ap = amountPrecision(market);
  const factor = Math.pow(10, ap);
  return Number((Math.floor(a * factor) / factor).toFixed(ap));
}

/* ---------- Plan generation ---------- */

/**
 * generateLimitPlans(options)
 * options: { price, side, amount, profile, variants }
 * profile: may contain profit_pct, loss_pct
 * variants: {
 *   postOnly: [true,false],
 *   entryOffsetTicks: [0, -1, 1, -2, 2],   // tick offsets from candidate price
 *   entryOffsetPct: [0, -0.001, 0.001],    // alternative: percent offsets
 *   scaleFactors: [1]                      // allow scaled amounts (1, 0.5 etc)
 *   slTypes: ['stopLimit','stop','limit']
 *   maxPlans: 24
 * }
 */
function generateLimitPlans({
  price,
  side = 'buy',
  amount,
  profile = {},
  variants = {}
} = {}) {
  const plans = [];
  const cand = Number(price);
  if (!Number.isFinite(cand) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return plans;

  const v = Object.assign({
    postOnly: [false, true],
    entryOffsetTicks: [0],
    entryOffsetPct: [],
    scaleFactors: [1],
    slTypes: ['stopLimit', 'stop', 'limit'],
    maxPlans: 40,
    minimalTpSlDistancePct: null // optional override
  }, variants || {});

  const base = computeTpSl(cand, side, profile);
  const profitPct = (typeof profile.profit_pct === 'number') ? profile.profit_pct : (profile.profit || 0.005);
  const lossPct = (typeof profile.loss_pct === 'number') ? profile.loss_pct : (profile.loss || 0.002);

  // generate combinations
  for (const sf of v.scaleFactors) {
    const amt = Number(amount) * Number(sf);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    for (const postOnly of v.postOnly) {
      for (const offsetTick of (v.entryOffsetTicks || [0])) {
        const entry = { price: cand + (offsetTick || 0), amount: amt, params: { postOnly: !!postOnly } };
        // also yield percent offsets if provided
        const entryVariants = [entry];
        for (const op of (v.entryOffsetPct || [])) {
          entryVariants.push({ price: cand * (1 + Number(op)), amount: amt, params: { postOnly: !!postOnly } });
        }
        for (const e of entryVariants) {
          // compute tp/sl per profile or use explicit values
          const computed = computeTpSl(e.price, side, profile);
          const tpBase = computed.tp;
          const slBase = computed.sl;
          for (const slType of (v.slTypes || ['stopLimit'])) {
            const plan = {
              id: makeId('plan'),
              entry: { type: 'limit', price: e.price, amount: e.amount, params: Object.assign({}, e.params) },
              tp: { type: 'limit', price: tpBase },
              sl: { type: slType, stopPrice: slBase, price: (slType === 'stopLimit' ? slBase : undefined) },
              meta: { createdAt: Date.now(), reason: 'generated_default', profile: Object.assign({}, profile), variant: { postOnly: !!postOnly, offsetTick, slType, scale: sf } }
            };
            plans.push(plan);
            if (plans.length >= v.maxPlans) return plans;
          }
        }
      } // offsetTick
    } // postOnly
  } // scale factors

  return plans;
}

/* ---------- Feasibility & pruning ---------- */

function minTpSlDistance(price, market, overridePct) {
  // return minimal absolute price distance for TP/SL from entry (in price units)
  const tick = marketTick(market);
  if (typeof overridePct === 'number' && overridePct > 0) {
    return Math.max(tick, Math.abs(price) * overridePct);
  }
  // default: enforce at least one tick and some small fraction (0.02% of price)
  const pct = 0.0002; // 0.02%
  return Math.max(tick, Math.abs(price) * pct);
}

function isPlanFeasible(plan, market) {
  try {
    if (!plan || !plan.entry || !plan.tp || !plan.sl) return false;
    const entryP = safeNumber(plan.entry.price, NaN);
    const tpP = safeNumber(plan.tp.price, NaN);
    const slP = safeNumber(plan.sl.stopPrice || plan.sl.price, NaN);
    if (!isFinite(entryP) || !isFinite(tpP) || !isFinite(slP)) return false;

    // deduce side: rely on profile meta if available; else guess by comparing tp vs entry
    let entrySide = plan.meta && plan.meta.profile && plan.meta.profile.side ? String(plan.meta.profile.side).toLowerCase() : null;
    if (!entrySide) {
      entrySide = tpP > entryP ? 'buy' : (tpP < entryP ? 'sell' : 'buy');
    }

    // logical relationships
    if (entrySide === 'buy') {
      if (!(tpP > entryP && slP < entryP)) return false;
    } else {
      if (!(tpP < entryP && slP > entryP)) return false;
    }

    // Enforce minimal TP/SL distance
    const minDist = minTpSlDistance(entryP, market, plan.meta && plan.meta.variant && plan.meta.variant.minTpSlDistancePct);
    if (Math.abs(tpP - entryP) < minDist || Math.abs(entryP - slP) < minDist) return false;

    // amount checks
    const amt = safeNumber(plan.entry.amount, NaN);
    if (!isFinite(amt) || amt <= 0) return false;
    if (market && market.limits && market.limits.amount && typeof market.limits.amount.min === 'number') {
      if (amt < market.limits.amount.min) return false;
    }
    if (market && market.limits && market.limits.amount && typeof market.limits.amount.max === 'number') {
      if (market.limits.amount.max > 0 && amt > market.limits.amount.max) return false;
    }

    // price bounds
    if (market && market.limits && market.limits.price) {
      const lp = market.limits.price;
      if (typeof lp.min === 'number' && lp.min > 0 && entryP < lp.min) return false;
      if (typeof lp.max === 'number' && lp.max > 0 && entryP > lp.max) return false;
    }

    // ensure TP/SL are not equal to entry after formatting (formatting will be applied later, but be conservative)
    if (tpP === entryP || slP === entryP) return false;

    return true;
  } catch (e) {
    return false;
  }
}

function formatAndPrunePlans(plans, market, opts = {}) {
  // opts: { debug:false, enforcePrecision:true }
  const out = [];
  const seen = new Set();
  const debug = !!opts.debug;
  for (const raw of (plans || [])) {
    try {
      const p = JSON.parse(JSON.stringify(raw)); // deep copy
      // attach market helpers
      if (market) {
        p.entry.price = formatPriceToPrecision(p.entry.price, market);
        p.entry.amount = formatAmountToPrecision(p.entry.amount, market);
        if (p.tp && p.tp.price !== undefined) p.tp.price = formatPriceToPrecision(p.tp.price, market);
        if (p.sl) {
          if (p.sl.stopPrice !== undefined) p.sl.stopPrice = formatPriceToPrecision(p.sl.stopPrice, market);
          if (p.sl.price !== undefined) p.sl.price = formatPriceToPrecision(p.sl.price, market);
        }
      } else {
        // still normalize to numbers
        p.entry.price = safeNumber(p.entry.price, p.entry.price);
        p.entry.amount = safeNumber(p.entry.amount, p.entry.amount);
        if (p.tp && p.tp.price !== undefined) p.tp.price = safeNumber(p.tp.price, p.tp.price);
        if (p.sl) {
          if (p.sl.stopPrice !== undefined) p.sl.stopPrice = safeNumber(p.sl.stopPrice, p.sl.stopPrice);
          if (p.sl.price !== undefined) p.sl.price = safeNumber(p.sl.price, p.sl.price);
        }
      }

      // ensure tp/sl not equal to entry; if equal nudge by one tick in direction of profit
      const tick = marketTick(market);
      if (p.tp && Number(p.tp.price) === Number(p.entry.price)) {
        if ((p.entry.params && p.entry.params.side === 'sell') || (p.meta && p.meta.profile && p.meta.profile.side === 'sell')) {
          p.tp.price = Number((Number(p.tp.price) - tick).toFixed(pricePrecision(market)));
        } else {
          p.tp.price = Number((Number(p.tp.price) + tick).toFixed(pricePrecision(market)));
        }
      }
      const slVal = Number(p.sl.stopPrice || p.sl.price || NaN);
      if (slVal === Number(p.entry.price)) {
        const dir = (p.entry.params && p.entry.params.side === 'sell') || (p.meta && p.meta.profile && p.meta.profile.side === 'sell') ? 1 : -1;
        const newSl = Number((slVal + (dir * tick)).toFixed(pricePrecision(market)));
        if (p.sl.stopPrice !== undefined) p.sl.stopPrice = newSl;
        if (p.sl.price !== undefined) p.sl.price = newSl;
      }

      // deduplicate by simple fingerprint (entry price, tp, sl, amount, postOnly)
      const fingerprint = `${p.entry.price}|${p.entry.amount}|${p.tp.price}|${p.sl.stopPrice||p.sl.price}|${(p.entry.params && !!p.entry.params.postOnly) ? 'm' : 't'}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);

      if (!isPlanFeasible(p, market)) {
        if (debug) console.warn('pruned infeasible plan', p.id, 'entry', p.entry.price, 'tp', p.tp.price, 'sl', p.sl.stopPrice || p.sl.price);
        continue;
      }

      out.push(p);
    } catch (e) {
      // skip
    }
  }
  return out;
}

/* ---------- Scoring ---------- */

function scorePlans(plans, ctx = {}) {
  // ctx: { market, orderbook, preferMaker: boolean }
  const market = ctx.market || null;
  const book = ctx.orderbook || null;
  const preferMaker = !!ctx.preferMaker;
  const results = [];

  for (const p of (plans || [])) {
    let score = 0;
    const entryP = safeNumber(p.entry.price, 0);
    const tpP = safeNumber(p.tp.price, 0);
    const slP = safeNumber(p.sl.stopPrice || p.sl.price, 0);
    const amt = safeNumber(p.entry.amount, 0);

    // expected absolute profit (in quote currency)
    const expectedProfit = Math.abs((tpP - entryP) * amt);

    // reward:risk
    const risk = Math.max(1e-12, Math.abs(entryP - slP));
    const reward = Math.max(1e-12, Math.abs(tpP - entryP));
    const rr = reward / risk;

    // base score: favor bigger profit, higher rr
    score += Math.log(1 + expectedProfit) * 3;
    score += Math.log(1 + rr) * 4;

    // maker preference
    if (p.entry.params && p.entry.params.postOnly) score += (preferMaker ? 4 : 2);

    // penalty for complex SL (stopLimit) vs simple limit - encourage simple
    if (p.sl && p.sl.type && p.sl.type !== 'limit') score -= 0.8;

    // if orderbook provided, reward plans that sit inside spread (more likely to execute quickly)
    if (book && Array.isArray(book.bids) && Array.isArray(book.asks) && book.bids.length && book.asks.length) {
      const bestBid = Number(book.bids[0][0]);
      const bestAsk = Number(book.asks[0][0]);
      // sitting between bestBid and bestAsk is favorable (tight)
      if (entryP > bestBid && entryP < bestAsk) score += 1.5;
      // closer to mid gets small bump
      const mid = (bestAsk + bestBid) / 2;
      const distToMid = Math.abs(entryP - mid);
      const midFactor = Math.max(0, 1 - (distToMid / Math.max(1, Math.abs(mid))));
      score += midFactor * 0.8;
    }

    // small penalty for plans with very small expectedProfit (dust)
    if (expectedProfit < 1e-6) score -= 2;

    // small randomization to break ties but controllable (we use crypto small value)
    // Avoid biased results from modulo on random bytes (CodeQL): use crypto.randomInt() when available,
    // otherwise fall back to rejection-sampling to produce an unbiased 0..999 integer.
    let rand = 0;
    if (typeof crypto.randomInt === 'function') {
      // uniform integer in [0, 1000)
      rand = crypto.randomInt(0, 1000) / 1000000;
    } else {
      // rejection sampling fallback to avoid modulo bias
      const RANGE = 1000;
      const MAX = 0x10000; // 65536
      const limit = MAX - (MAX % RANGE); // largest multiple of RANGE < MAX
      let n;
      do {
        n = crypto.randomBytes(2).readUInt16BE(0);
      } while (n >= limit);
      rand = (n % RANGE) / 1000000;
    }
    score += rand;

    results.push(Object.assign({}, p, { score }));
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return results;
}

/* ---------- Chooser ---------- */

function chooseBestPlan(plans, ctx = {}) {
  const scored = scorePlans(plans, ctx);
  if (!scored || scored.length === 0) return null;
  return scored[0];
}

/* ---------- Convenience wrapper ---------- */

function planForCandidate(candidate = {}, opts = {}) {
  // candidate: { price, side, amount, profile }
  // opts: { market, orderbook, variants, debug }
  const price = safeNumber(candidate.price, NaN);
  const side = (candidate.side || 'buy').toString().toLowerCase();
  const amount = safeNumber(candidate.amount, NaN);
  const profile = candidate.profile || {};
  const market = opts.market || null;
  const orderbook = opts.orderbook || null;
  const variants = Object.assign({}, opts.variants || {});
  const debug = !!opts.debug;

  const raw = generateLimitPlans({ price, side, amount, profile, variants });
  const formatted = formatAndPrunePlans(raw, market, { debug });
  const allScored = scorePlans(formatted, { market, orderbook, preferMaker: !!(profile.prefer_maker || profile.preferMaker || variants.preferMaker) });
  const best = allScored && allScored.length ? allScored[0] : null;

  return { all: allScored, best };
}

/* ---------- Exports ---------- */

module.exports = {
  generateLimitPlans,
  formatAndPrunePlans,
  scorePlans,
  chooseBestPlan,
  planForCandidate,
  // helpers
  formatPriceToPrecision,
  formatAmountToPrecision,
  computeTpSl,
  marketTick,
  pricePrecision,
  amountPrecision
};
