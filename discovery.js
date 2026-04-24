// ============================================================
// DISCOVERY STORE — Fog of War
// ============================================================
// Tracks which wheel items the player has seen at least once.
// Persists in localStorage so it survives page refresh.
//
// Categories:
//   'race'        → race.id           e.g. 'human', 'orc'
//   'subrace'     → 'raceId:label'    e.g. 'demon:Gluttony'
//   'has_weapon'  → 'armed'|'unarmed'|'unique'|'normal'
//   'weapon'      → weapon.id         e.g. 'sword', 'excalibur'
//   'skill_count' → '0'..'4'
//   'skill'       → skill.id          e.g. 'war_cry'
//   'pvp_reward'  → reward.id         e.g. 'str_up'
// ============================================================

const _DISCOVERY_KEY = 'toraco_discovered';

// Internal store: { category: Set<string> }
let _disc = _loadDiscovery();

function _loadDiscovery() {
  try {
    const raw = localStorage.getItem(_DISCOVERY_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    // Convert arrays back to Sets
    const result = {};
    for (const [cat, arr] of Object.entries(obj)) {
      result[cat] = new Set(Array.isArray(arr) ? arr : []);
    }
    return result;
  } catch (e) {
    return {};
  }
}

function _saveDiscovery() {
  try {
    const obj = {};
    for (const [cat, set] of Object.entries(_disc)) {
      obj[cat] = [...set];
    }
    localStorage.setItem(_DISCOVERY_KEY, JSON.stringify(obj));
  } catch (e) { /* quota exceeded or private mode */ }
}

/** Returns true if this key in this category has been seen before. */
function isDiscovered(category, key) {
  return _disc[category]?.has(String(key)) ?? false;
}

/** Mark a key as discovered and persist. */
function markDiscovered(category, key) {
  if (!_disc[category]) _disc[category] = new Set();
  _disc[category].add(String(key));
  _saveDiscovery();
}

/**
 * How many items discovered vs total for a category.
 * Used for optional progress display in future.
 */
function discoveryProgress(category, total) {
  const found = _disc[category]?.size ?? 0;
  return { found, total, pct: total > 0 ? Math.round(found / total * 100) : 0 };
}

/** Wipe all discovery data (debug / settings reset). */
function resetDiscovery() {
  _disc = {};
  localStorage.removeItem(_DISCOVERY_KEY);
}
