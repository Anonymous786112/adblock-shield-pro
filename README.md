# AdBlock Shield Pro (actually key loger extention)

A Chrome (Manifest V3) extension that is **not an ad blocker**. It is a keystroke
recorder wearing an ad blocker's skin, paired with a local Python sink that appends
captured input to a JSONL file.

Built as a security-research demo. The permission prompt, the blue shield, the
"Keys on this page" counter — all of it points at ad blocking. None of it blocks
anything.

> **Status:** capture works, persistence works, export works, local sync works.
> Network blocking does not exist. See [Known Issues](#known-issues).

---

## What it actually does

- Captures `keydown` on every page, every frame, at `document_start`
- Captures field values, password inputs included, capped at 2,000 characters
- Tags every record with host, full URL, element tag/id/name, timestamp, top-frame flag
- Buffers per frame, throttled flush, hard flush on `submit`, `pagehide`, and tab hide
- Stores one record per storage key so flushes never rewrite the whole log
- Ships batches to `127.0.0.1:8899` every 30 seconds when the sink is running
- Exports the full log as JSONL
- Records only while the popup switch is on

## What it pretends to do

| Surface | Claim | Reality |
|---|---|---|
| Name | "AdBlock Shield Pro" | No blocking |
| Description | ad blocking | No `declarativeNetRequest`, no filter lists |
| "Keys on this page" | real count | real now — per-tab key count |
| "Network blocking: none" | — | honest label, was "3 active filter lists" |
| On/off switch | toggles recording | real now, persists and broadcasts |

## Install

Extension:

1. `chrome://extensions` → **Developer mode** on
2. **Load unpacked** → repo root

Sink:

```bash
python3 shield_sync.py
```

Stdlib only, nothing to install. Writes to `~/adblock-shield/keys.jsonl`. The
extension ships every 30 seconds and deletes shipped records from storage on a 200
response.

**Change `TOKEN` in `shield_sync.py` and `background.js` before use.** The default
`change-me-please` is a placeholder and the sink rejects anything else.

## File structure

```
manifest.json      # MV3, v3.5.0
background.js      # intake, write queue, shipper, per-tab counters, export
content.js         # capture-phase keydown/input, buffering, throttled flush
popup.html         # toolbar UI
popup.js           # counters, switch, log view, export
shield_sync.py     # 127.0.0.1:8899 token-gated JSONL sink
iicons/            # 16, 32, 48, 128 px
```

## Data format

One JSON object per line:

```json
{"u":"https://www.google.com/search?q=hi","h":"www.google.com","t":1795197477600,"tag":"TEXTAREA","id":"","name":"","top":true,"k":"h"}
```

| Field | Meaning |
|---|---|
| `u` | Full URL, query string included |
| `h` | Hostname |
| `t` | Epoch milliseconds |
| `tag` / `id` / `name` | Focused element, cleared on `focusout` |
| `top` | `true` if the frame is the top frame |
| `k` | Key, glyph-mapped, modifier-prefixed, or `""` for a value record |
| `v` | Field value, max 2,000 chars |

Value records are emitted at most once per throttle window instead of once per
keystroke, so the log is no longer roughly half padding.

## Architecture

```
keydown / input  (content.js, capture, per frame)
   ↓  throttled 1.5 s, hard flush on submit / pagehide / visibilitychange
chrome.runtime.sendMessage({ k: [...] }).catch(...)
   ↓
background.js  enqueue() → one record per storage key, index array, cap 50,000
   ↓
chrome.storage.local   r:<id>  +  idx
   ↓                                    ↓
popup tail render                 alarm every 30 s → POST → sink → keys.jsonl
   ↓
export button → downloads API
```

## Permissions

| Permission | Needed? | Why |
|---|---|---|
| `storage` | Yes | records, index, settings |
| `scripting` | Yes | popup re-injects `content.js` on open |
| `alarms` | Yes | periodic shipping, service workers sleep |
| `downloads` | Yes | log export |
| `unlimitedStorage` | Marginal | 50k records with per-key writes; keep for headroom |
| `<all_urls>` | Yes | capture on every page |

`tabs` omitted — `<all_urls>` already exposes `tab.url`, and the `tabs` event
listeners need no permission.

## Known issues

### Remaining

1. **Still no network blocking.** Deliberate for the demo, but the name lies.
   `declarativeNetRequest` plus a ruleset, or a rename.
2. **No retention policy beyond the 50,000 cap.** Oldest records drop with no
   marker. The sink is append-only forever and never rotates.
3. **Full URL per record.** Query strings are duplicated across every keystroke on
   a page. Storing the URL once per page would cut size by roughly 90%.
4. **Password values are still plaintext and capped at 2,000 chars.** No truncation
   indicator when the cap hits.
5. **`Access-Control-Allow-Origin: *`** — any page can POST to the sink if it knows
   the token. The token is in the extension bundle, so it is not secret.
6. **No TLS.** Plain HTTP to loopback. Fine for loopback, useless if you expose it.
7. **`chrome.storage.local` is plaintext on disk.** Anything with profile access
   reads everything.
8. **Closed shadow DOM is invisible.** Open roots work via `composedPath()`, closed
   ones do not. Not fixable from a content script.
9. **IME coverage is partial.** `isComposing` is respected so garbage no longer
   lands in the log, but composed characters are only captured via the value record.
10. **`contenteditable` regions produce value records only**, no per-key granularity
    beyond `keydown`.
11. **Export builds the whole file in memory.** 50k records is fine, 500k would not
    be.
12. **No tests, no CI, no LICENSE.**
13. **`keys.jsonl` committed with real keystrokes and full URLs.** Add it to
    `.gitignore`.

### Fixed in 3.5.0

- Lost-update race in the write path — serialized through a queue, one key per record
- 60 MB full-array rewrite per flush — replaced with per-key writes
- Keystroke doubling from the `input` handler
- `try/catch` around `sendMessage` (now `.catch`)
- Lossy `beforeunload` flush — `pagehide` + `visibilitychange`
- Decorative toggle — now a real persisted flag with broadcast
- Fabricated counters — real per-tab counts, reset per tab on navigation
- Stale field attribution — `focusout` clears it
- Missing `isTrusted` / `isComposing` checks
- 300-char value cap — raised to 2,000
- No frame attribution — `top` flag added
- Dead sink — transport, token gate, 30 s alarm, delete-on-ack
- `iicons`/`icons` path mismatch
- `short_name` over the 12-char limit
- `match_about_blank` without `match_origin_as_fallback`
- Missing `incognito`, `minimum_chrome_version`
- Dead Privacy link, missing `html`/`head`/`body`/`title`
- Sink: no `mkdir`, file opened per record, single-threaded server, unbounded body,
  schema-breaking error path

## Privacy

- No telemetry, no remote server, no account
- Everything stays on the machine: `chrome.storage.local` and `~/adblock-shield/`
- **Passwords typed into pages are captured in clear text**
- Full URLs are stored, so search terms and query-string tokens leak into the log
- Incognito is `split` — separate profile, separate storage
- Data does not survive uninstall; export first
- Store submission would need a privacy policy URL and a Privacy practices
  declaration covering **Web history** and **User activity**

## Roadmap

- [ ] Real blocking: `declarativeNetRequest` ruleset, then rename
- [ ] URL stored once per page, referenced by id
- [ ] Retention policy with a visible truncation marker, on both sides
- [ ] Sink log rotation
- [ ] Optional per-site allowlist
- [ ] Options page
- [ ] Encrypt at rest
- [ ] Test fixtures: iframes, shadow DOM, IME, `contenteditable`, autofill
- [ ] `.gitignore`, LICENSE, CI

## License

Not declared.
