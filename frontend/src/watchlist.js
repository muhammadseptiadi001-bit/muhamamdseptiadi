const STORAGE_KEY = "saham_forex_watchlist";

export function loadWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors (private browsing, quota, etc.) - watchlist
    // just won't persist across reloads in that case.
  }
}
