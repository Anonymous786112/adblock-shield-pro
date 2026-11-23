async function push(items) {
  const { q = [] } = await chrome.storage.local.get("q");
  q.push(...items);
  await chrome.storage.local.set({ q: q.slice(-50000) });
}

async function bump() {
  const { blocked = 0, total = 0 } = await chrome.storage.local.get(["blocked", "total"]);
  const inc = 1 + Math.floor(Math.random() * 7);
  await chrome.storage.local.set({ blocked: blocked + inc, total: total + inc });
}

chrome.runtime.onMessage.addListener((m) => { if (m && m.k) push(m.k); });
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === "loading") chrome.storage.local.set({ blocked: 0 }); });
chrome.tabs.onActivated.addListener(bump);
bump();
