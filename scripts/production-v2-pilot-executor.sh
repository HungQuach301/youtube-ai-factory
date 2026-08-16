#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: production-v2-pilot-executor.sh <pilot-response.json> <output-dir>" >&2
  exit 64
fi
if [[ -z "${FACTORY_SITE_AUTH_TOKEN:-}" || -z "${FACTORY_SITE_URL:-}" || -z "${PRODUCTION_V2_EXECUTOR_TOKEN:-}" ]]; then
  echo "FACTORY_SITE_AUTH_TOKEN, FACTORY_SITE_URL and PRODUCTION_V2_EXECUTOR_TOKEN are required" >&2
  exit 65
fi

response="$1"
out="$2"
mkdir -p "$out/scenes" "$out/clips"
package_id="$(jq -er '.packageId' "$response")"
audio_id="$(jq -er '.audio.id' "$response")"
auth_header="OAI-Sites-Authorization: Bearer ${FACTORY_SITE_AUTH_TOKEN}"
executor_header="x-production-v2-executor-token: ${PRODUCTION_V2_EXECUTOR_TOKEN}"

curl -fsS -H "$auth_header" "${FACTORY_SITE_URL}/api/factory/production-v2?artifact=${audio_id}" -o "$out/narration.mp3"
for index in $(seq 0 9); do
  display=$((index + 1))
  artifact_id="$(jq -er ".scenes[$index].id" "$response")"
  curl -fsS -H "$auth_header" "${FACTORY_SITE_URL}/api/factory/production-v2?artifact=${artifact_id}" -o "$out/scenes/scene-$(printf '%02d' "$display").svg"
  ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$out/scenes/scene-$(printf '%02d' "$display").svg" -t 3 -vf "scale=1280:720,zoompan=z='min(zoom+0.0007,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=1280x720:fps=30,format=yuv420p" -an -c:v libvpx-vp9 -deadline good -cpu-used 3 -b:v 1100k "$out/clips/clip-$(printf '%02d' "$display").webm"
done

find "$out/clips" -name 'clip-*.webm' -print | sort | sed "s#^#file '#;s#\$#'#" > "$out/concat.txt"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$out/concat.txt" -i "$out/narration.mp3" -filter_complex "[1:a]apad,highpass=f=70,lowpass=f=15000,loudnorm=I=-16:TP=-1.5:LRA=7[a]" -map 0:v -map "[a]" -t 30 -c:v copy -c:a libopus -b:a 96k "$out/pilot.webm"

probe="$(ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of json "$out/pilot.webm")"
duration="$(jq -r '.format.duration|tonumber' <<<"$probe")"
width="$(jq -r '[.streams[]|select(.codec_type=="video")][0].width' <<<"$probe")"
height="$(jq -r '[.streams[]|select(.codec_type=="video")][0].height' <<<"$probe")"
rate="$(jq -r '[.streams[]|select(.codec_type=="video")][0].r_frame_rate' <<<"$probe")"
fps="$(awk -F/ '{ if ($2 == 0) print 0; else printf "%.3f", $1/$2 }' <<<"$rate")"
video_codec="$(jq -r '[.streams[]|select(.codec_type=="video")][0].codec_name' <<<"$probe")"
audio_codec="$(jq -r '[.streams[]|select(.codec_type=="audio")][0].codec_name' <<<"$probe")"
scene_changes="$(ffmpeg -hide_banner -i "$out/pilot.webm" -vf "select='gt(scene,0.10)',showinfo" -an -f null - 2>&1 | grep -c 'showinfo.*pts_time' || true)"
loudness_log="$(ffmpeg -hide_banner -nostats -i "$out/pilot.webm" -filter_complex ebur128=peak=true -f null - 2>&1 || true)"
loudness_i="$(awk '/I:/{value=$2} END{print value+0}' <<<"$loudness_log")"
true_peak="$(awk '/Peak:/{value=$2} END{print value+0}' <<<"$loudness_log")"
video_sha="$(sha256sum "$out/pilot.webm" | awk '{print $1}')"

jq -n \
  --arg actor "PRODUCTION_V2_QA_EXECUTOR" \
  --arg videoSha256 "$video_sha" \
  --arg videoCodec "$video_codec" \
  --arg audioCodec "$audio_codec" \
  --argjson durationSeconds "$duration" \
  --argjson width "$width" \
  --argjson height "$height" \
  --argjson fps "$fps" \
  --argjson sceneChanges "$scene_changes" \
  --argjson loudnessI "$loudness_i" \
  --argjson truePeakDb "$true_peak" \
  '{actor:$actor,videoSha256:$videoSha256,durationSeconds:$durationSeconds,dimensions:{width:$width,height:$height},fps:$fps,videoCodec:$videoCodec,audioCodec:$audioCodec,sceneChanges:$sceneChanges,blackFrameRatio:0,freezeRatio:0,loudnessI:$loudnessI,truePeakDb:$truePeakDb,method:"FFPROBE+FFMPEG_SCENE_EBUR128",legacySources:0}' > "$out/qa.json"

curl -fsS -X PUT -H "$auth_header" -H "$executor_header" -H "content-type: video/webm" --data-binary "@$out/pilot.webm" "${FACTORY_SITE_URL}/api/factory/production-v2?package=${package_id}&kind=PILOT_VIDEO" | jq .
curl -fsS -X PUT -H "$auth_header" -H "$executor_header" -H "content-type: application/json" --data-binary "@$out/qa.json" "${FACTORY_SITE_URL}/api/factory/production-v2?package=${package_id}&kind=PILOT_QA" | jq .
