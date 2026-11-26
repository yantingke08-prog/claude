#!/usr/bin/env bash
# Dev helper: contact sheet of out/stills — scripts/sheet.sh out.jpg f1 f2 ...  (needs ImageMagick `magick`)
o=$1; shift; ins=(); for f in "$@"; do ins+=("out/stills/f$(printf %04d "$f").jpg"); done
magick "${ins[@]}" -resize 432x768 +append "$o"
