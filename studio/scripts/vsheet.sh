#!/usr/bin/env bash
# Contact sheet for 9:16 stills: 4 columns of 405x720 tiles.
# Usage: bash scripts/vsheet.sh out.jpg a.jpg b.jpg ...
set -e
FF="${FFMPEG:-$HOME/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe}"
out=$1; shift
n=$#; args=(); fl=""; lay=""
for i in $(seq 0 $((n-1))); do
  args+=(-i "${@:$((i+1)):1}")
  fl+="[$i:v]scale=405:720[v$i];"
  c=$((i%4)); r=$((i/4))
  lay+="$((c*405))_$((r*720))|"
done
ins=""; for i in $(seq 0 $((n-1))); do ins+="[v$i]"; done
"$FF" -v error -y "${args[@]}" -filter_complex "${fl}${ins}xstack=inputs=$n:layout=${lay%|}:fill=black" -q:v 3 "$out"
