#!/usr/bin/env python3
"""Build the deployable game into ./dist.

    python3 tools/build.py

Steps
1. Validate every JSON file under content/ (required fields, originality, ids unique).
2. Concatenate src/systems/** in manifest order inside one IIFE, with the content bundled in front
   as window.MM_CONTENT -> dist/a/game.<hash>.js.
3. Copy three.js and the self-hosted fonts, and write styles -> dist/a/*.<hash>.*.
4. Write dist/index.html (it is the only file that names the hashed ones) and dist/healthz.
5. Write dist/vercel.json: security headers for every path (deploy/headers.json) and cache rules
   (deploy/cache.json): everything under /a/ is immutable, everything else revalidates.
6. Minify game.js with esbuild (pinned in package.json; `npm ci --ignore-scripts` installs it).
   Without it the build still works, unminified, with a warning and no budget check.
7. Write .gz copies of text files for nginx's gzip_static, then check the first-load size budget.
8. Syntax-check game.js with node if it is installed.

Files under dist/a/ are named by a hash of their bytes, so a file only changes name when it changes,
and browsers can keep it for a year without asking again.

dist/ is build output and is never committed. A dist/.vercel link, if present, is kept.
"""
import gzip, hashlib, json, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, CONTENT, DIST = ROOT / 'src', ROOT / 'content', ROOT / 'dist'
ASSETS = DIST / 'a'
FONTS = ROOT / 'vendor' / 'fonts'
# esbuild's native binary (node_modules/@esbuild/<platform>/bin/esbuild) runs without Node,
# so the Python-only Docker build stage can use it too.
ESBUILD = next(iter(sorted((ROOT / 'node_modules' / '@esbuild').glob('*/bin/esbuild'))), None)
# Gzip bytes a phone fetches before the first frame (HTML, CSS, scripts, preloaded font), minified.
# three.js is about 145 of it; raise this only on purpose, and say so in the PR.
BUDGET_KB = 240

REQUIRED = {
    'character': ['id', 'name', 'kind', 'world', 'originality'],
    'world': ['id', 'name', 'status', 'originality'],
}
KINDS = {'hero', 'boss', 'creep', 'spirit', 'mount'}


def fail(msg):
    raise SystemExit(f'content error: {msg}')


def load_content():
    characters, worlds, ids = [], [], set()
    for path in sorted((CONTENT / 'characters').rglob('*.json')):
        d = json.loads(path.read_text())
        for k in REQUIRED['character']:
            if k not in d: fail(f'{path.relative_to(ROOT)} is missing "{k}"')
        if d['kind'] not in KINDS: fail(f'{path.relative_to(ROOT)} has unknown kind "{d["kind"]}"')
        if d['originality'] != 'original': fail(f'{path.relative_to(ROOT)}: all characters must be original')
        if d['id'] in ids: fail(f'duplicate character id "{d["id"]}"')
        ids.add(d['id']); characters.append(d)
    for path in sorted((CONTENT / 'worlds').rglob('world.json')):
        d = json.loads(path.read_text())
        for k in REQUIRED['world']:
            if k not in d: fail(f'{path.relative_to(ROOT)} is missing "{k}"')
        if d['originality'] != 'original': fail(f'{path.relative_to(ROOT)}: all worlds must be original')
        worlds.append(d)
    env_path = CONTENT / 'environments.json'
    environments = json.loads(env_path.read_text()) if env_path.exists() else []
    for e in environments:
        if 'name' not in e: fail('every environment needs a "name"')
    return {'characters': characters, 'worlds': worlds, 'environments': environments}


def emit(name, data):
    """Write data to dist/a/ as <stem>.<hash>.<ext> and return its URL relative to index.html."""
    if isinstance(data, str): data = data.encode()
    stem, ext = name.rsplit('.', 1)
    out = f'{stem}.{hashlib.sha256(data).hexdigest()[:10]}.{ext}'
    (ASSETS / out).write_bytes(data)
    return f'a/{out}'


def font_faces():
    """@font-face rules for vendor/fonts/<family>-latin-<weight>.woff2, plus the URL of each file."""
    rules, urls = [], {}
    for f in sorted(FONTS.glob('*.woff2')):
        weight = f.stem.rsplit('-', 1)[1]
        url = emit(f.name, f.read_bytes())
        urls[weight] = url
        rules.append(f'@font-face{{font-family:"IBM Plex Mono";font-style:normal;font-weight:{weight};font-display:swap;'
                     f'src:url("{url[2:]}") format("woff2")}}')
    return '\n'.join(rules) + '\n', urls


def minify(js):
    """Minify with esbuild if it is installed; otherwise return js unchanged."""
    if ESBUILD is None: return None
    r = subprocess.run([str(ESBUILD), '--minify', '--target=es2019', '--charset=utf8', '--log-level=warning'],
                       input=js, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr); raise SystemExit('esbuild could not minify game.js')
    return r.stdout


def clean_dist():
    DIST.mkdir(exist_ok=True)
    for child in DIST.iterdir():
        if child.name == '.vercel': continue
        shutil.rmtree(child) if child.is_dir() else child.unlink()
    ASSETS.mkdir()


def build():
    content = load_content()
    clean_dist()

    manifest = json.loads((SRC / 'systems' / 'manifest.json').read_text())
    parts = []
    for rel in manifest:
        code = (SRC / 'systems' / rel).read_text()
        parts.append(f'  // ===== src/systems/{rel} =====\n{code}')
    game_js = ('window.MM_CONTENT = ' + json.dumps(content, separators=(',', ':')) + ';\n'
               '(function () {\n' + '\n'.join(parts) + '})();\n')
    small = minify(game_js)
    if small is None:
        print('warning: esbuild not installed (npm ci --ignore-scripts), so game.js is not minified '
              'and the size budget is not checked', file=sys.stderr)
    game = emit('game.js', small or game_js)
    three = emit('three.js', (ROOT / 'vendor' / 'three.min.js').read_bytes())
    faces, fonts = font_faces()
    styles = emit('styles.css', '[hidden]{display:none!important}\n' + faces + (SRC / 'styles' / 'game.css').read_text())
    (DIST / 'healthz').write_text('ok\n')

    markup = (SRC / 'index.html').read_text()
    (DIST / 'index.html').write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="referrer" content="no-referrer">\n<title>Moonlit Moat</title>\n'
        f'<link rel="preload" href="{fonts["400"]}" as="font" type="font/woff2" crossorigin>\n'
        f'<link rel="stylesheet" href="{styles}">\n</head>\n<body>\n' + markup +
        f'<script src="{three}"></script>\n<script src="{game}"></script>\n'
        '</body>\n</html>\n')

    headers = json.loads((ROOT / 'deploy' / 'headers.json').read_text())
    cache = json.loads((ROOT / 'deploy' / 'cache.json').read_text())
    prefix = cache['assets']['path'].strip('/')
    vercel = {"cleanUrls": True, "headers": [
        {"source": "/(.*)", "headers": [{"key": k, "value": v} for k, v in headers.items()]},
        {"source": f"/{prefix}/(.*)", "headers": [{"key": "Cache-Control", "value": cache['assets']['cache-control']}]},
        {"source": f"/((?!{prefix}/).*)", "headers": [{"key": "Cache-Control", "value": cache['default']['cache-control']}]},
    ]}
    (DIST / 'vercel.json').write_text(json.dumps(vercel, indent=2) + '\n')

    for f in [DIST / 'index.html', *ASSETS.glob('*.js'), *ASSETS.glob('*.css')]:
        f.with_name(f.name + '.gz').write_bytes(gzip.compress(f.read_bytes(), 9, mtime=0))

    first_load = [DIST / 'index.html', DIST / styles, DIST / three, DIST / game, DIST / fonts['400']]
    size = sum(len(gzip.compress(f.read_bytes(), 9)) for f in first_load) / 1024
    if small is not None and size > BUDGET_KB:
        raise SystemExit(f'first load is {size:.1f} KB gzip, over the {BUDGET_KB} KB budget (tools/build.py BUDGET_KB)')

    if shutil.which('node'):
        r = subprocess.run(['node', '--check', str(DIST / game)], capture_output=True, text=True)
        if r.returncode != 0:
            sys.stderr.write(r.stderr); raise SystemExit('game.js failed the syntax check')
    print(f'built dist/ from {len(manifest)} systems, {len(content["characters"])} characters, '
          f'{len(content["worlds"])} worlds, {len(content["environments"])} environments; '
          f'first load {size:.1f} KB gzip of {BUDGET_KB} KB budget')


if __name__ == '__main__':
    build()
