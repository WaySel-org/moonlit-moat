#!/usr/bin/env python3
"""Print nginx add_header lines from deploy/headers.json, so Vercel and the container share one header policy."""
import json, pathlib

headers = json.loads((pathlib.Path(__file__).resolve().parent.parent / 'deploy' / 'headers.json').read_text())
for key, value in headers.items():
    print(f'add_header {key} "{value}" always;')
