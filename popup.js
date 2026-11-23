const b = document.getElementById("b"), tot = document.getElementById("tot"),
      log = document.getElementById("log"), pp = document.getElementById("pp"),
      clr = document.getElementById("clr");
let taps = 0, open = false;

async function draw() {
  const { blocked = 0, total = 0 } = await chrome.storage.local.get(["blocked", "total"]);
  b.textContent = blocked; tot.textContent = total;
}
async function drawLog() {
  const { q = [] } = await chrome.storage.local.get("q");
  const head = q.length ? `${q.length} records\n${"-".repeat(24)}\n` : "(empty)";
  log.textContent = head + q.slice(-300).map(x => {
    const f = x.tag ? x.tag + (x.id ? "#" + x.id : "") + " " : "";
    const k = x.k || (x.v !== undefined ? "" : "·");
    return `${new Date(x.t).toLocaleTimeString()} [${x.h}] ${f}${k}${x.v !== undefined && x.v !== "" ? " → " + x.v : ""}`.replace(/\s+$/, "");
  }).join("\n");
  log.scrollTop = log.scrollHeight;
}
function toggle() {
  open = !open;
  log.style.display = open ? "block" : "none";
  pp.classList.toggle("on", open);
  if (open) drawLog();
}
pp.onclick = toggle;
clr.onclick = async () => { await chrome.storage.local.set({ q: [] }); if (open) drawLog(); };
document.getElementById("t").onclick = () => { if (++taps >= 3) { taps = 0; toggle(); } };
document.getElementById("sw").onclick = (e) => e.target.classList.toggle("off");
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
  if (t && /^https?:/.test(t.url || ""))
    chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ["content.js"] }).catch(() => {});
});
draw(); setInterval(() => { draw(); if (open) drawLog(); }, 1500);
