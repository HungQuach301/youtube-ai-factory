#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then echo "usage: production-v2-full-executor.sh <prepare-response.json> <output-dir>" >&2; exit 64; fi
if [[ -z "${FACTORY_SITE_AUTH_TOKEN:-}" || -z "${FACTORY_SITE_URL:-}" || -z "${PRODUCTION_V2_EXECUTOR_TOKEN:-}" ]]; then echo "Production V2 executor credentials are required" >&2; exit 65; fi

response="$1"; out="$2"; mkdir -p "$out/scenes" "$out/frames"
package_id="$(jq -er '.packageId' "$response")"; audio_count="$(jq -er '.audioChunks|length' "$response")"
auth="OAI-Sites-Authorization: Bearer ${FACTORY_SITE_AUTH_TOKEN}"; executor="x-production-v2-executor-token: ${PRODUCTION_V2_EXECUTOR_TOKEN}"
for index in $(seq 0 $((audio_count - 1))); do display=$((index + 1)); audio_id="$(jq -er ".audioChunks[$index].id" "$response")"; curl -fsS -H "$auth" "${FACTORY_SITE_URL}/api/factory/production-v2?artifact=${audio_id}" -o "$out/narration-$(printf '%02d' "$display").mp3"; done
find "$out" -maxdepth 1 -name 'narration-*.mp3' -print | sort | sed "s#^#file '#;s#\$#'#" > "$out/audio.txt"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$out/audio.txt" -c copy "$out/narration.mp3"
for index in $(seq 0 29); do display=$((index + 1)); artifact="$(jq -er ".scenes[$index].id" "$response")"; curl -fsS -H "$auth" "${FACTORY_SITE_URL}/api/factory/production-v2?artifact=${artifact}" -o "$out/scenes/scene-$(printf '%02d' "$display").svg"; done
find "$out/scenes" -name 'scene-*.svg' -print | sort | sed "s#^#file '#;s#\$#'#" > "$out/scenes.txt"
audio_duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$out/narration.mp3")"
tempo="$(awk -v duration="$audio_duration" 'BEGIN{value=duration/708;if(value<0.8)value=0.8;if(value>1.25)value=1.25;printf "%.6f",value}')"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$out/scenes.txt" -i "$out/narration.mp3" -filter_complex "[0:v]scale=1280:720,zoompan=z='min(zoom+0.00008,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=720:s=1280x720:fps=30,format=yuv420p[v];[1:a]atempo=${tempo},apad,highpass=f=70,lowpass=f=15000,loudnorm=I=-16:TP=-3:LRA=7[a]" -map "[v]" -map "[a]" -t 720 -c:v libvpx-vp9 -deadline realtime -cpu-used 6 -b:v 150k -maxrate 220k -bufsize 440k -row-mt 1 -c:a libopus -b:a 64k "$out/master.webm"

if [[ "${PRODUCTION_V2_SKIP_UPLOAD:-0}" == "1" ]]; then
  printf 'Rendered %s; upload intentionally deferred for sequential admission.\n' "$package_id"
  exit 0
fi

"$(dirname "$0")/production-v2-qa-upload.sh" "$response" "$out/master.webm" "$out"
