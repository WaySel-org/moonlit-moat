#!/usr/bin/env python3
"""Print nginx add_header lines, so Vercel and the container share one header policy.

    python3 tools/nginx_headers.py                 # security headers, from deploy/headers.json
    python3 tools/nginx_headers.py cache assets    # Cache-Control for /a/ (hashed files), from deploy/cache.json
    python3 tools/nginx_headers.py cache default   # Cache-Control for everything else
"""
import json, pathlib, sys

DEPLOY = pathlib.Path(__file__).resolve().parent.parent / 'deploy'
if sys.argv[1:2] == ['cache']:
    print(f'add_header Cache-Control "{json.loads((DEPLOY / "cache.json").read_text())[sys.argv[2]]["cache-control"]}" always;')
else:
    for key, value in json.loads((DEPLOY / 'headers.json').read_text()).items():
        print(f'add_header {key} "{value}" always;')
