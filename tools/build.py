#!/usr/bin/env python3
"""Build the deployable game into ./dist.

    python3 tools/build.py

Steps
1. Validate every JSON file under content/ (required fields, originality, ids unique).
2. Concatenate src/systems/** in manifest order inside one IIFE -> dist/game.js.
3. Bundle content -> dist/content.js (window.MM_CONTENT), styles -> dist/styles.css.
4. Write dist/index.html, copy three.js to dist/vendor/, write dist/healthz.
5. Write dist/vercel.json with strict security headers (deploy/headers.json is the single source).
6. Syntax-check game.js with node if it is installed.

dist/ is build output and is never committed. A dist/.vercel link, if present, is kept.
"""
import json, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, CONTENT, DIST = ROOT / 'src', ROOT / 'content', ROOT / 'dist'

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


def build():
    content = load_content()
    DIST.mkdir(exist_ok=True)
    (DIST / 'vendor').mkdir(exist_ok=True)

    manifest = json.loads((SRC / 'systems' / 'manifest.json').read_text())
    parts = []
    for rel in manifest:
        code = (SRC / 'systems' / rel).read_text()
        parts.append(f'  // ===== src/systems/{rel} =====\n{code}')
    (DIST / 'game.js').write_text('(function () {\n' + '\n'.join(parts) + '})();\n')

    (DIST / 'content.js').write_text('window.MM_CONTENT = ' + json.dumps(content, separators=(',', ':')) + ';\n')
    (DIST / 'styles.css').write_text('[hidden]{display:none!important}\n' + (SRC / 'styles' / 'game.css').read_text())
    shutil.copyfile(ROOT / 'vendor' / 'three.min.js', DIST / 'vendor' / 'three.min.js')
    (DIST / 'healthz').write_text('ok\n')

    markup = (SRC / 'index.html').read_text()
    (DIST / 'index.html').write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="referrer" content="no-referrer">\n<title>Moonlit Moat</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap">\n'
        '<link rel="stylesheet" href="styles.css">\n</head>\n<body>\n' + markup +
        '<script src="vendor/three.min.js"></script>\n<script src="content.js"></script>\n<script src="game.js"></script>\n'
        '</body>\n</html>\n')

    headers = json.loads((ROOT / 'deploy' / 'headers.json').read_text())
    vercel = {"cleanUrls": True, "headers": [{"source": "/(.*)", "headers": [{"key": k, "value": v} for k, v in headers.items()]}]}
    (DIST / 'vercel.json').write_text(json.dumps(vercel, indent=2) + '\n')

    if shutil.which('node'):
        r = subprocess.run(['node', '--check', str(DIST / 'game.js')], capture_output=True, text=True)
        if r.returncode != 0:
            sys.stderr.write(r.stderr); raise SystemExit('game.js failed the syntax check')
    print(f'built dist/ from {len(manifest)} systems, {len(content["characters"])} characters, '
          f'{len(content["worlds"])} worlds, {len(content["environments"])} environments')


if __name__ == '__main__':
    build()
