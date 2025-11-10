// lib/runtime_flags.js
// Robust parsing of environment flags. Use this everywhere instead of reading process.env directly.

function parseBool(v, defaultValue = false) {
  if (v === undefined || v === null) return defaultValue;
  const s = String(v).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(s);
}

const DEBUG = parseBool(process.env.DEBUG, false);

// Choose your default: if you want DRY by default set second arg true, otherwise false.
// I recommend explicit env; set default to false so live must be opted in.
const DRY_RUN = parseBool(process.env.DRY_RUN, false);
const FORCE_DRY = parseBool(process.env.FORCE_DRY, false);
const ENABLE_LIVE = parseBool(process.env.ENABLE_LIVE, false);

// Derived
const IS_LIVE = !FORCE_DRY && ENABLE_LIVE && !DRY_RUN;

module.exports = { parseBool, DEBUG, DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE };
