#!/usr/bin/env python3
"""Split a single-file build of the game (src/game.html style) into the modular source tree.

Usage: python3 tools/split.py path/to/game.html

Writes:
  src/index.html              markup only (head/scripts are added by the build)
  src/styles/game.css         all styles
  src/systems/**.js           one file per code section, grouped by domain
  src/systems/manifest.json   the order the build concatenates them in

Re-runnable: use it to fold changes made against the old single file (for example an
agent branch) back into the modular tree. Section headers look like
`  // ---------- Name ----------`; a section runs until the next header.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Section title prefix -> (domain folder, file name). Order of the game is preserved by the manifest.
DOMAINS = [
    ('Lights', 'render', 'lights'),
    ('Sky', 'render', 'sky'),
    ('Ground with a lake', 'world/moat', 'ground-and-lake'),
    ('Castle', 'world/moat', 'castle'),
    ('Outpost keeps', 'world/moat', 'outpost-keeps'),
    ('Trees and rocks', 'world/moat', 'trees-and-rocks'),
    ('Bushes and power pods', 'world/moat', 'power-pods'),
    ('Grass', 'world/moat', 'grass'),
    ('Player (local', 'actors/player', 'player-model'),
    ('The Gate Warden (boss)', 'actors/bosses', 'warden-model'),
    ('Telegraphs', 'render', 'telegraphs-and-sparks'),
    ('Water', 'world/moat', 'water'),
    ('ASCII post-process', 'render', 'ascii-pass'),
    ('Sound', 'core', 'sound'),
    ('Game state', 'core', 'game-state'),
    ('Player actions', 'actors/player', 'player-actions'),
    ('Power pods and moon bolts', 'actors/player', 'boosts-and-bolts'),
    ('Targets', 'actors/player', 'targeting-and-combat'),
    ('Boss behaviour', 'actors/bosses', 'warden-behaviour'),
    ('Vesthra and Nyxara', 'actors/bosses', 'rooftop-royals'),
    ('Cinderwing', 'actors/bosses', 'cinderwing'),
    ('Fireworks', 'render', 'fireworks'),
    ('Progression', 'actors/player', 'progression'),
    ("Warden's Leap", 'actors/player', 'warden-leap'),
    ('Creeps', 'actors/creeps', 'creeps'),
    ('Treasure chests', 'world/moat', 'treasure-chests'),
    ('Moon Shrine', 'world/moat', 'moon-shrine'),
    ('HUD', 'ui', 'hud'),
    ('Maze entrances', 'world/moat', 'maze-entrances'),
    ('Maze traps', 'world/moat', 'maze-traps'),
    ('Hedge maze', 'world/moat', 'hedge-maze'),
    ('Changing environments', 'world', 'environments'),
    ('Sword swooshes', 'actors/player', 'sword-swooshes'),
    ('Mythical beasts', 'actors/mounts', 'beasts-and-mounts'),
    ('Warden hunts', 'actors/bosses', 'warden-hunts'),
    ('Readability', 'render', 'gameplay-mask'),
    ('The Spirit Realm', 'world/spirit', 'spirit-realm'),
    ('Map', 'ui', 'minimap'),
    ('Content', 'core', 'content'),
    ('Pause', 'core', 'pause'),
    ('Input', 'core', 'input'),
    ('Renderer controls', 'ui', 'renderer-controls'),
    ('Player update', 'actors/player', 'player-update'),
    ('Loop', 'core', 'loop'),
]
HEADER = re.compile(r'^\s*// -{6,} (.*?) -{6,}\s*$')


def place(title):
    for prefix, folder, name in DOMAINS:
        if title.startswith(prefix):
            return folder, name
    raise SystemExit(f'No domain mapping for section "{title}". Add it to DOMAINS in tools/split.py.')


def main(src_path):
    src = pathlib.Path(src_path).read_text()
    head, _, rest = src.partition('<style>')
    css, _, rest = rest.partition('</style>')
    markup, _, rest = rest.partition('<script src=')
    script = re.findall(r'<script>(.*?)</script>', rest, re.S)
    if len(script) != 1:
        raise SystemExit('Expected exactly one inline <script> in the source file.')
    body = script[0].strip('\n')
    if not body.lstrip().startswith('(function () {') or not body.rstrip().endswith('})();'):
        raise SystemExit('Expected the game script to be wrapped in (function () { ... })();')
    body = body.lstrip()[len('(function () {'):].rstrip()[:-len('})();')]
    lines = body.split('\n')

    out = ROOT / 'src'
    (out / 'styles').mkdir(parents=True, exist_ok=True)
    (out / 'styles' / 'game.css').write_text(css.strip('\n') + '\n')
    (out / 'index.html').write_text(markup.strip('\n') + '\n')

    systems = out / 'systems'
    for old in systems.rglob('*.js'):
        old.unlink()
    chunks, title, buf = [], 'Bootstrap', []
    for line in lines:
        m = HEADER.match(line)
        if m:
            chunks.append((title, buf)); title, buf = m.group(1), []
        buf.append(line)
    chunks.append((title, buf))

    manifest = []
    for i, (title, buf) in enumerate(chunks):
        folder, name = ('core', 'bootstrap') if title == 'Bootstrap' else place(title)
        rel = f'{folder}/{i:02d}-{name}.js'
        path = systems / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('\n'.join(buf).strip('\n') + '\n')
        manifest.append(rel)
    (systems / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'split into {len(manifest)} system files')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'src' / 'game.html')
