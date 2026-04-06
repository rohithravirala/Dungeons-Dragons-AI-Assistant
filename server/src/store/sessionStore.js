const sessionMemory = new Map();
const MAX_ENTRIES = 15;

export function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function appendSessionEntry(sessionId, entry) {
  const current = sessionMemory.get(sessionId) || [];
  const updated = [...current, { ...entry, timestamp: new Date().toISOString() }].slice(-MAX_ENTRIES);
  sessionMemory.set(sessionId, updated);
}

export function getSessionEntries(sessionId) {
  return sessionMemory.get(sessionId) || [];
}
