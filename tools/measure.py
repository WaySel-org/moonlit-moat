#!/usr/bin/env python3
"""Measure what a phone downloads to start the game, from a built dist/.

    python3 tools/measure.py [dist_dir] [--fetch-external] [--json]

Reports, for a first visit and a repeat visit:
- every file on the first load, raw / gzip / Brotli size (Brotli needs the `brotli` CLI),
- how many servers (origins) the browser must connect to,
- which requests block the first paint,
- what a repeat visit re-requests, using the Cache-Control rules in dist/vercel.json
  (Vercel's default, max-age=0 must-revalidate, when no rule matches).
And a simple timing model on a slow 4G link (150 ms RTT, 1.6 Mbps, Lighthouse's mobile preset).

--fetch-external also downloads outside resources (e.g. Google Fonts) once to size them.
"""
import gzip, json, pathlib, re, shutil, subprocess, sys, urllib.request

RTT, BW = 0.150, 1.6e6 / 8          # seconds, bytes per second
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
DEFAULT_CACHE = 'public, max-age=0, must-revalidate'


def br_size(data):
    if not shutil.which('brotli'): return None
    return len(subprocess.run(['brotli', '-c', '-q', '11'], input=data, capture_output=True).stdout)


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=15) as r:
        return r.read()


def cache_rule(dist, path):
    rule = DEFAULT_CACHE
    vj = dist / 'vercel.json'
    if vj.exists():
        for block in json.loads(vj.read_text()).get('headers', []):
            if re.fullmatch(block['source'], path):   # Vercel sources used here are plain regexes
                for h in block['headers']:
                    if h['key'].lower() == 'cache-control': rule = h['value']
    return rule


def first_load(dist, fetch_external):
    html = (dist / 'index.html').read_text()
    items = [{'url': '/', 'kind': 'html', 'blocking': True, 'data': html.encode()}]
    seen = set()
    weights = {'400'}   # browsers fetch a font weight only if some text uses it

    def faces(css):
        """(weight, url) for each Latin @font-face; Google's sheet labels its subsets with comments."""
        if '/* latin */' in css: css = ''.join(re.findall(r'/\* latin \*/\s*(@font-face\s*\{[^}]*\})', css))
        return re.findall(r'@font-face\s*\{[^}]*?font-weight:\s*(\d+)[^}]*?url\(["\']?([^)"\']+)["\']?\)', css)

    def add(url, kind, blocking):
        if not url.startswith('http'): url = '/' + url.lstrip('/')
        if url in seen or url.startswith('data:'): return
        seen.add(url)
        if url.startswith('http'):
            data = None
            if fetch_external:
                try: data = fetch(url)
                except Exception as e: print(f'  could not fetch {url}: {e}', file=sys.stderr)
            items.append({'url': url, 'kind': kind, 'blocking': blocking, 'data': data})
            if kind == 'css' and data:
                external_css.append(data.decode())
            return
        path = '/' + url.lstrip('/')
        f = dist / path.lstrip('/')
        data = f.read_bytes() if f.exists() else None
        items.append({'url': path, 'kind': kind, 'blocking': blocking, 'data': data})
        if kind == 'css' and data:
            css = data.decode()
            weights.update(re.findall(r'(?<!@font-face\{)font-weight:\s*(\d+)', re.sub(r'@font-face\s*\{[^}]*\}', '', css)))
            own_css.append((path, css))

    external_css, own_css = [], []
    for tag in re.findall(r'<(?:link|script)\b[^>]*>', html):
        href = re.search(r'(?:href|src)="([^"]+)"', tag)
        if not href: continue
        url = href.group(1)
        if 'rel="preconnect"' in tag: continue
        if tag.startswith('<script'):
            add(url, 'js', 'defer' not in tag and 'async' not in tag)
        elif 'rel="stylesheet"' in tag:
            add(url, 'css', True)
        elif 'rel="preload"' in tag:
            add(url, re.search(r'as="(\w+)"', tag).group(1).replace('script', 'js'), False)
    for css in external_css:
        for w, url in faces(css):
            if w in weights: add(url, 'font', False)
    for path, css in own_css:
        for w, url in faces(css):
            if w in weights: add(str(pathlib.PurePosixPath(path).parent / url), 'font', False)
    return items


def origin(url):
    return url.split('/')[2] if url.startswith('http') else 'self'


def measure(dist, fetch_external=False):
    dist = pathlib.Path(dist)
    items = first_load(dist, fetch_external)
    for it in items:
        d = it.pop('data')
        it['raw'] = len(d) if d else None
        it['gz'] = len(gzip.compress(d, 9)) if d else None
        it['br'] = br_size(d) if d else None
        it['cache'] = cache_rule(dist, it['url']) if origin(it['url']) == 'self' else 'third party'
        it['repeat'] = 'none' if ('immutable' in it['cache'] or re.search(r'max-age=[1-9]', it['cache'])) else 'revalidate'
    origins = sorted({origin(i['url']) for i in items})
    wire = lambda i: i['br'] or i['gz'] or i['raw'] or 0
    total = sum(wire(i) for i in items)
    blocking_origins = {origin(i['url']) for i in items if i['blocking']}

    # Timing model. Each new origin costs DNS + TCP + TLS 1.3 = 3 RTT; then 1 RTT per request round.
    html = items[0]
    t_html = 3 * RTT + RTT + wire(html) / BW
    paint = t_html
    for o in blocking_origins - {'self'}:
        paint = max(paint, t_html + 3 * RTT + RTT + sum(wire(i) for i in items if origin(i['url']) == o and i['blocking']) / BW)
    own_blocking = [i for i in items[1:] if i['blocking'] and i['kind'] == 'css' and origin(i['url']) == 'self']
    if own_blocking: paint = max(paint, t_html + RTT + sum(wire(i) for i in own_blocking) / BW)
    ready = t_html + RTT + sum(wire(i) for i in items[1:]) / BW + (3 * RTT if len(origins) > 1 else 0)
    revalidations = [i for i in items if i['repeat'] == 'revalidate' and origin(i['url']) == 'self']
    repeat_ready = (3 * RTT + RTT) if revalidations else 0
    repeat_ready += RTT if len(revalidations) > 1 else 0   # third-party files are left out: they follow their own cache rules
    return {
        'files': items, 'origins': origins, 'requests': len(items), 'bytes': total,
        'model': {'first_paint_s': round(paint, 2), 'scripts_ready_s': round(ready, 2),
                  'repeat_network_s': round(repeat_ready, 2), 'repeat_requests': len(revalidations)},
    }


def kb(n): return '—' if n is None else f'{n / 1024:.1f}'


def report(m, title):
    print(f'\n== {title} ==')
    print(f'{"file":44} {"raw KB":>7} {"gz KB":>7} {"br KB":>7}  block  repeat visit')
    for i in m['files']:
        print(f'{i["url"][:44]:44} {kb(i["raw"]):>7} {kb(i["gz"]):>7} {kb(i["br"]):>7}  {"yes" if i["blocking"] else "no ":5}  {i["repeat"] if i["cache"] != "third party" else "third party"}')
    print(f'requests {m["requests"]}, servers {len(m["origins"])} ({", ".join(m["origins"])}), on the wire {m["bytes"] / 1024:.1f} KB')
    md = m['model']
    print(f'slow 4G model: first paint {md["first_paint_s"]} s, scripts ready {md["scripts_ready_s"]} s; '
          f'repeat visit: {md["repeat_requests"]} requests, {md["repeat_network_s"]} s of network wait')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    m = measure(args[0] if args else pathlib.Path(__file__).resolve().parent.parent / 'dist', '--fetch-external' in sys.argv)
    if '--json' in sys.argv: print(json.dumps(m, indent=2))
    else: report(m, str(args[0] if args else 'dist'))
