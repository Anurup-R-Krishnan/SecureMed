#!/usr/bin/env python3
"""Align bun.lock with the patched/patched-adjacent manifests.

Bun 1.3.x resolves dependency instances from the pristine manifest and keeps
stale lockfile entries, so patched ranges and newer resolutions are not
reflected. This script rewrites the stale entries so the lockfile matches the
intended tree:

1. next manifest: sharp ^0.34.3 -> ^0.35.3, postcss 8.4.31 -> ^8.5.6, so next
   dedupes with the patched top-level instances.
2. Removes the stale nested instances next/sharp -> sharp@0.34.5 (vulnerable
   libvips), next/postcss -> postcss@8.4.31, and
   @tailwindcss/postcss/postcss -> postcss@8.5.6 (each superseded by the root
   instance; @tailwindcss/postcss's ^8.5.6 range is satisfied by 8.5.26).

Run `bun install` afterwards and verify with `bun pm ls sharp postcss`.
"""
import re
import sys

path = "bun.lock"
with open(path, encoding="utf-8") as f:
    text = f.read()

# 1. Widen ranges in the `next` manifest entry.
# postcss must be rewritten; sharp may already be applied (idempotent).
text, n_postcss = re.subn(r'"postcss": "8\.4\.31"', '"postcss": "^8.5.6"', text)
if n_postcss != 1:
    print(f"ERROR: expected 1 postcss range match, got {n_postcss}", file=sys.stderr)
    sys.exit(1)

text, n_sharp = re.subn(r'"sharp": "\^0\.34\.3"', '"sharp": "^0.35.3"', text)
if n_sharp > 1:
    print(f"ERROR: expected 0 or 1 sharp range matches, got {n_sharp}", file=sys.stderr)
    sys.exit(1)

# 2. Drop the stale nested instances.
instance_prefixes = [
    '"next/sharp": ["sharp@0.34.5"',
    '"next/postcss": ["postcss@8.4.31"',
    '"@tailwindcss/postcss/postcss": ["postcss@8.5.6"',
]
lines = text.splitlines(keepends=True)
kept = []
per_prefix = {p: 0 for p in instance_prefixes}
for line in lines:
    matched = None
    for p in instance_prefixes:
        if line.strip().startswith(p):
            matched = p
            break
    if matched is not None:
        per_prefix[matched] += 1
        continue
    kept.append(line)

# next/sharp may already be removed (idempotent); the postcss instances must be.
if per_prefix['"next/sharp": ["sharp@0.34.5"'] > 1:
    print("ERROR: multiple next/sharp instances found", file=sys.stderr)
    sys.exit(1)
for p in instance_prefixes[1:]:
    if per_prefix[p] != 1:
        print(f"ERROR: expected exactly 1 match for {p!r}, got {per_prefix[p]}", file=sys.stderr)
        sys.exit(1)

removed = sum(per_prefix.values())
with open(path, "w", encoding="utf-8") as f:
    f.writelines(kept)
print(f"OK: widened next ranges and removed {removed} stale nested instances")
