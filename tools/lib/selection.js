'use strict';

/**
 * tools/lib/selection.js - enhanced
 *
 * getProfileData(backtestData, neuralnetData, name)
 *
 * Enhancements:
 * - Caches indexed-shaped inputs (WeakMap) with both array and name->index map for O(1) lookups
 * - Robust canonicalization of names for matching (case, whitespace, trailing suffixes)
 * - Handles many wrapped shapes (.data, .results) and nested name locations (params.name, params.strategy, metrics.name)
 * - Defensive and performs light-weight checks / short-circuits
 */

const indexedCache = new WeakMap(); // obj -> { array, mapByCanonicalName, sourceKey }

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function canonicalizeName(n) {
  if (!n && n !== 0) return '';
  let s = String(n).trim().toLowerCase();
  // remove common suffixes like "#1", "(1)", trailing digits and spaces
  s = s.replace(/[#\(\)\s-]+$/g, '').replace(/#\d+$/g, '').replace(/\(\d+\)$/, '').trim();
  // normalize plus/minus and whitespace differences
  s = s.replace(/\+/g, 'plus').replace(/\-/g, 'minus').replace(/\s+/g, ' ');
  return s;
}

function isIndexedTopLevel(obj) {
  if (!isObject(obj)) return false;
  const keys = Object.keys(obj);
  if (!keys.length) return false;
  return keys.every(k => /^[0-9]+$/.test(k));
}

function extractNameFromCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  // Many shapes: candidate.params.name, candidate.name, candidate.profileName
  if (candidate.params && typeof candidate.params.name === 'string') return candidate.params.name;
  if (candidate.params && typeof candidate.params.strategyName === 'string') return candidate.params.strategyName;
  if (candidate.params && typeof candidate.params.profile === 'string') return candidate.params.profile;
  if (typeof candidate.name === 'string') return candidate.name;
  if (typeof candidate.profileName === 'string') return candidate.profileName;
  if (candidate.params && typeof candidate.params.strategy === 'string') return candidate.params.strategy;
  if (candidate.metrics && typeof candidate.metrics.name === 'string') return candidate.metrics.name;
  // Some neuralnet objects put name under candidate.params?.modelName etc.
  if (candidate.params && typeof candidate.params.modelName === 'string') return candidate.params.modelName;
  return null;
}

function normalizeMetricsFromBacktest(candidate) {
  if (!candidate) return null;
  if (candidate.metrics && typeof candidate.metrics === 'object') return candidate.metrics;
  if (candidate.params && candidate.params.metrics && typeof candidate.params.metrics === 'object') return candidate.params.metrics;
  if (candidate.params && isObject(candidate.params)) return candidate.params;
  if (Array.isArray(candidate.trades)) return candidate; // caller may compute metrics from trades
  return candidate;
}

function getArrayFromPossibleIndexed(container) {
  if (!container) return null;
  if (Array.isArray(container)) return container;
  if (isIndexedTopLevel(container)) {
    // try to extract the array using numeric keys
    const keys = Object.keys(container).filter(k => /^[0-9]+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    if (!keys.length) return null;
    // prefer entries that contain .results or .data
    for (const k of keys) {
      const el = container[k];
      if (!el) continue;
      if (Array.isArray(el.results) && el.results.length) return el.results;
      if (Array.isArray(el.data) && el.data.length) return el.data;
      if (Array.isArray(el)) return el;
    }
    // fallback: return mapped array of values in numeric order
    const arr = keys.map(k => container[k]).filter(Boolean);
    if (arr.length) return arr;
  }
  if (Array.isArray(container.data) && container.data.length) return container.data;
  if (Array.isArray(container.results) && container.results.length) return container.results;
  return null;
}

function buildIndexedCache(container) {
  // returns { array, mapByCanonicalName, sourceKey }
  if (!container || typeof container !== 'object') return null;
  const cached = indexedCache.get(container);
  if (cached) return cached;

  const arr = getArrayFromPossibleIndexed(container);
  if (!arr || !arr.length) {
    indexedCache.set(container, null);
    return null;
  }

  const map = new Map();
  for (let i = 0; i < arr.length; i++) {
    const el = arr[i];
    if (!el) continue;
    const rawName = extractNameFromCandidate(el);
    if (rawName) {
      const key = canonicalizeName(rawName);
      if (key) map.set(key, { index: i, entry: el });
      // also store original lower-case form for quick matching
      const lc = String(rawName).trim().toLowerCase();
      if (lc && !map.has(lc)) map.set(lc, { index: i, entry: el });
    }
    // also store if the element itself has a .name string
    if (el.name && typeof el.name === 'string') {
      const k2 = canonicalizeName(el.name);
      if (k2 && !map.has(k2)) map.set(k2, { index: i, entry: el });
    }
  }

  const res = { array: arr, mapByCanonicalName: map, sourceKey: 'indexed' };
  indexedCache.set(container, res);
  return res;
}

function findProfileInNamedShape(container, name) {
  if (!isObject(container) || !name) return null;
  const target = canonicalizeName(name);
  // check container.profiles first (common)
  if (isObject(container.profiles)) {
    // exact property
    if (Object.prototype.hasOwnProperty.call(container.profiles, name)) {
      return { obj: container.profiles[name], path: `profiles.${name}` };
    }
    // case-insensitive direct key match
    const foundKey = Object.keys(container.profiles).find(k => canonicalizeName(k) === target);
    if (foundKey) return { obj: container.profiles[foundKey], path: `profiles.${foundKey}` };
    // try looking inside each profile object for nested names
    for (const k of Object.keys(container.profiles)) {
      const candidate = container.profiles[k];
      const rawName = extractNameFromCandidate(candidate);
      if (rawName && canonicalizeName(rawName) === target) return { obj: candidate, path: `profiles.${k}` };
    }
  }

  // top-level direct match
  if (Object.prototype.hasOwnProperty.call(container, name)) {
    return { obj: container[name], path: name };
  }
  // case-insensitive / canonical key match
  const topKey = Object.keys(container).find(k => canonicalizeName(k) === target);
  if (topKey) return { obj: container[topKey], path: topKey };

  // search nested objects for candidate name
  for (const k of Object.keys(container)) {
    const v = container[k];
    if (!v || typeof v !== 'object') continue;
    const rawName = extractNameFromCandidate(v);
    if (rawName && canonicalizeName(rawName) === target) return { obj: v, path: k };
  }

  return null;
}

function findProfileInIndexedArrayUsingCache(container, name) {
  const built = buildIndexedCache(container);
  if (!built || !built.array || !built.mapByCanonicalName) return null;
  const target = canonicalizeName(name);
  // direct canonical match
  if (built.mapByCanonicalName.has(target)) {
    const rec = built.mapByCanonicalName.get(target);
    return { obj: rec.entry, path: `indexed.results[${rec.index}]` };
  }
  // try lower-case match fallback
  if (built.mapByCanonicalName.has(name.toLowerCase())) {
    const rec = built.mapByCanonicalName.get(name.toLowerCase());
    return { obj: rec.entry, path: `indexed.results[${rec.index}]` };
  }
  // partial contains / includes heuristics (rare)
  for (const [k, rec] of built.mapByCanonicalName.entries()) {
    if (k.includes(target) || target.includes(k)) {
      return { obj: rec.entry, path: `indexed.results[${rec.index}]` };
    }
  }
  return null;
}

/**
 * getProfileData(backtestData, neuralnetData, name)
 * returns { bt, btPath, nn, nnPath }
 */
function getProfileData(backtestData, neuralnetData, name) {
  const out = { bt: null, btPath: null, nn: null, nnPath: null };
  if (!name) return out;
  const qName = String(name).trim();
  if (!qName) return out;

  // 1) Named-shape fast checks for backtestData
  if (isObject(backtestData)) {
    const found = findProfileInNamedShape(backtestData, qName);
    if (found) {
      out.bt = normalizeMetricsFromBacktest(found.obj);
      out.btPath = found.path;
    }
  }

  // 2) Indexed-shaped backtestData via cache
  if (!out.bt && backtestData) {
    const found = findProfileInIndexedArrayUsingCache(backtestData, qName);
    if (found) {
      out.bt = normalizeMetricsFromBacktest(found.obj);
      out.btPath = found.path;
    } else {
      // fallback: try to find in any .data/.results array without using cache
      const arr = getArrayFromPossibleIndexed(backtestData);
      if (arr && arr.length) {
        const idx = arr.findIndex((el) => {
          const n = extractNameFromCandidate(el);
          return n && canonicalizeName(n) === canonicalizeName(qName);
        });
        if (idx >= 0) {
          out.bt = normalizeMetricsFromBacktest(arr[idx]);
          out.btPath = `indexed.results[${idx}]`;
        }
      }
    }
  }

  // 3) Named-shape fast checks for neuralnetData
  if (isObject(neuralnetData)) {
    const found = findProfileInNamedShape(neuralnetData, qName);
    if (found) {
      const candidate = found.obj;
      out.nn = (candidate && (candidate.metrics || candidate.params)) ? (candidate.metrics || candidate.params) : candidate;
      out.nnPath = found.path;
    }
  }

  // 4) Indexed-shaped neuralnetData via cache
  if (!out.nn && neuralnetData) {
    const found = findProfileInIndexedArrayUsingCache(neuralnetData, qName);
    if (found) {
      const candidate = found.obj;
      out.nn = (candidate && (candidate.metrics || candidate.params)) ? (candidate.metrics || candidate.params) : candidate;
      out.nnPath = found.path;
    } else {
      const arr = getArrayFromPossibleIndexed(neuralnetData);
      if (arr && arr.length) {
        const idx = arr.findIndex((el) => {
          const n = extractNameFromCandidate(el);
          return n && canonicalizeName(n) === canonicalizeName(qName);
        });
        if (idx >= 0) {
          const candidate = arr[idx];
          out.nn = (candidate.metrics || candidate.params) || candidate;
          out.nnPath = `indexed.results[${idx}]`;
        }
      }
    }
  }

  // 5) Heuristic fallback: case-insensitive partial match (if either missing)
  const lname = canonicalizeName(qName);
  if ((!out.bt || !out.nn) && (backtestData || neuralnetData)) {
    if (!out.bt && backtestData && isObject(backtestData)) {
      if (isObject(backtestData.profiles)) {
        const key = Object.keys(backtestData.profiles).find(k => canonicalizeName(k) === lname || canonicalizeName(k).includes(lname) || lname.includes(canonicalizeName(k)));
        if (key) {
          out.bt = normalizeMetricsFromBacktest(backtestData.profiles[key]);
          out.btPath = `profiles.${key}`;
        }
      }
      if (!out.bt) {
        const arr = getArrayFromPossibleIndexed(backtestData);
        if (arr) {
          const idx = arr.findIndex(el => {
            const n = extractNameFromCandidate(el);
            return n && (canonicalizeName(n) === lname || canonicalizeName(n).includes(lname) || lname.includes(canonicalizeName(n)));
          });
          if (idx >= 0) {
            out.bt = normalizeMetricsFromBacktest(arr[idx]);
            out.btPath = `indexed.results[${idx}]`;
          }
        }
      }
    }

    if (!out.nn && neuralnetData && isObject(neuralnetData)) {
      if (isObject(neuralnetData.profiles)) {
        const key = Object.keys(neuralnetData.profiles).find(k => canonicalizeName(k) === lname || canonicalizeName(k).includes(lname) || lname.includes(canonicalizeName(k)));
        if (key) {
          const candidate = neuralnetData.profiles[key];
          out.nn = (candidate.metrics || candidate.params) || candidate;
          out.nnPath = `profiles.${key}`;
        }
      }
      if (!out.nn) {
        const arr = getArrayFromPossibleIndexed(neuralnetData);
        if (arr) {
          const idx = arr.findIndex(el => {
            const n = extractNameFromCandidate(el);
            return n && (canonicalizeName(n) === lname || canonicalizeName(n).includes(lname) || lname.includes(canonicalizeName(n)));
          });
          if (idx >= 0) {
            const candidate = arr[idx];
            out.nn = (candidate.metrics || candidate.params) || candidate;
            out.nnPath = `indexed.results[${idx}]`;
          }
        }
      }
    }
  }

  return out;
}

module.exports = { getProfileData };
