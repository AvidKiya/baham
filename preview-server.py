"""سرور پیش‌نمایش باهم — فایل‌های out/ با پشتیبانی از مسیرهای Next.js و SPA fallback."""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8909
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        raw = self.path
        q = ""
        if "?" in raw:
            raw, q = raw.split("?", 1)
            q = "?" + q
        rel = raw.lstrip("/") or "index.html"
        fs = os.path.join(ROOT, rel)
        if os.path.isdir(fs):
            rel = os.path.join(rel, "index.html")
            fs = os.path.join(ROOT, rel)
        if os.path.isfile(fs):
            self.path = "/" + rel + q
        elif os.path.isfile(fs + ".html"):
            self.path = "/" + rel + ".html" + q
        else:
            self.path = "/index.html" + q
        return super().send_head()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"Serving {ROOT} on 0.0.0.0:{PORT}", flush=True)
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
