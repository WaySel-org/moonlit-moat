# Builds the deployable game into ./moonlit-moat (used for localhost and Vercel): python3 build-local.py
# - index.html holds only markup and styles; the game code lives in game.js so the page can forbid inline scripts
# - three.js is bundled in vendor/ so no third-party script host is involved
# - vercel.json sends strict security headers
import json, pathlib, re, shutil

here = pathlib.Path(__file__).parent
src = (here / 'moonlit-moat.html').read_text()
out = here / 'moonlit-moat'
(out / 'vendor').mkdir(parents=True, exist_ok=True)

scripts = re.findall(r'<script>(.*?)</script>', src, re.S)
assert len(scripts) == 1, 'expected exactly one inline script'
(out / 'game.js').write_text(scripts[0].strip() + '\n')

page = re.sub(r'<script>.*?</script>', '<script src="game.js"></script>', src, flags=re.S)
page = page.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
                    '<script src="vendor/three.min.js"></script>')
head, sep, body = page.partition('</style>')
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="referrer" content="no-referrer">\n'
        '<style>[hidden]{display:none!important}</style>\n'
        + head + sep + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
(out / 'index.html').write_text(html)

shutil.copyfile(here / 'vendor-dl' / 'three.min.js', out / 'vendor' / 'three.min.js')

csp = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
])
headers = [
    {"key": "Content-Security-Policy", "value": csp},
    {"key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload"},
    {"key": "X-Content-Type-Options", "value": "nosniff"},
    {"key": "X-Frame-Options", "value": "DENY"},
    {"key": "Referrer-Policy", "value": "no-referrer"},
    {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
    {"key": "Cross-Origin-Opener-Policy", "value": "same-origin"},
    {"key": "Cross-Origin-Resource-Policy", "value": "same-origin"},
]
(out / 'vercel.json').write_text(json.dumps({"cleanUrls": True, "headers": [{"source": "/(.*)", "headers": headers}]}, indent=2) + '\n')
print('built', out)
