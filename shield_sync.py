import json, time, pathlib
from http.server import BaseHTTPRequestHandler, HTTPServer

LOG = pathlib.Path.home()/"adblock-shield"/"keys.jsonl"

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n)
        try:
            for row in json.loads(raw or b"[]"):
                LOG.open("a").write(json.dumps(row) + "\n")
        except Exception:
            LOG.open("a").write(json.dumps({"raw": raw.decode("utf8", "replace")}) + "\n")
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass

HTTPServer(("127.0.0.1", 8899), H).serve_forever()
