
// tools/lib/runtime_flags.js
// Robust runtime flag parsing for the project.
// Import this module from tools/* files and use flags.IS_LIVE as the single source of truth.

function parseBool(v, defaultValue = false) {
  if (v === undefined || v === null) return defaultValue;
  const s = String(v).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(s);
}

// Choose safe defaults. If you want the old behavior (DRY by default)
// change the defaultValue for DRY_RUN to true.
const DEBUG = parseBool(process.env.DEBUG, false);
const DRY_RUN = parseBool(process.env.DRY_RUN, false);
const FORCE_DRY = parseBool(process.env.FORCE_DRY, false);
const ENABLE_LIVE = parseBool(process.env.ENABLE_LIVE, false);
const FORCE_SUBMIT = parseBool(process.env.FORCE_SUBMIT, false);
const TRUST_SIGNALS = parseBool(process.env.TRUST_SIGNALS, false);

// Derived: only live when explicitly enabled, and not forced dry and not in DRY_RUN
const IS_LIVE = ENABLE_LIVE && !FORCE_DRY && !DRY_RUN;

module.exports = {
  parseBool,
  DEBUG,
  DRY_RUN,
  FORCE_DRY,
  ENABLE_LIVE,
  FORCE_SUBMIT,
  TRUST_SIGNALS,
  IS_LIVE
};
