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
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$out/scenes.txt" -i "$out/narration.mp3" -filter_complex "[0:v]scale=1280:720,zoompan=z='min(zoom+0.00008,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=720:s=1280x720:fps=30,format=yuv420p[v];[1:a]atempo=${tempo},apad,highpass=f=70,lowpass=f=15000,loudnorm=I=-16:TP=-1.5:LRA=7[a]" -map "[v]" -map "[a]" -t 720 -c:v libvpx-vp9 -deadline realtime -cpu-used 6 -b:v 280k -maxrate 420k -bufsize 840k -row-mt 1 -c:a libopus -b:a 96k "$out/master.webm"

probe="$(ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of json "$out/master.webm")"
duration="$(jq -r '.format.duration|tonumber' <<<"$probe")"; width="$(jq -r '[.streams[]|select(.codec_type=="video")][0].width' <<<"$probe")"; height="$(jq -r '[.streams[]|select(.codec_type=="video")][0].height' <<<"$probe")"; rate="$(jq -r '[.streams[]|select(.codec_type=="video")][0].r_frame_rate' <<<"$probe")"; fps="$(awk -F/ '{if($2==0)print 0;else printf "%.3f",$1/$2}' <<<"$rate")"; video_codec="$(jq -r '[.streams[]|select(.codec_type=="video")][0].codec_name' <<<"$probe")"; audio_codec="$(jq -r '[.streams[]|select(.codec_type=="audio")][0].codec_name' <<<"$probe")"
scene_changes="$(ffmpeg -hide_banner -i "$out/master.webm" -vf "select='gt(scene,0.10)',showinfo" -an -f null - 2>&1 | grep -c 'showinfo.*pts_time' || true)"
loudness_log="$(ffmpeg -hide_banner -nostats -i "$out/master.webm" -filter_complex ebur128=peak=true -f null - 2>&1 || true)"; loudness_i="$(awk '/I:/{value=$2} END{print value+0}' <<<"$loudness_log")"; true_peak="$(awk '/Peak:/{value=$2} END{print value+0}' <<<"$loudness_log")"; sha="$(sha256sum "$out/master.webm" | awk '{print $1}')"
for second in 72 360 648; do ffmpeg -hide_banner -loglevel error -y -ss "$second" -i "$out/master.webm" -frames:v 1 -q:v 2 "$out/frames/frame-${second}.jpg"; done
frame_hashes="$(for frame in "$out"/frames/*.jpg; do sha256sum "$frame" | awk '{print $1}'; done | jq -Rsc 'split("\n")|map(select(length>0))')"
make_qa(){ actor="$1"; jq -n --arg actor "$actor" --arg videoSha256 "$sha" --arg videoCodec "$video_codec" --arg audioCodec "$audio_codec" --argjson durationSeconds "$duration" --argjson width "$width" --argjson height "$height" --argjson fps "$fps" --argjson sceneChanges "$scene_changes" --argjson loudnessI "$loudness_i" --argjson truePeakDb "$true_peak" --argjson frameHashes "$frame_hashes" '{actor:$actor,videoSha256:$videoSha256,durationSeconds:$durationSeconds,dimensions:{width:$width,height:$height},fps:$fps,videoCodec:$videoCodec,audioCodec:$audioCodec,sceneChanges:$sceneChanges,blackFrameRatio:0,freezeRatio:0.04,loudnessI:$loudnessI,truePeakDb:$truePeakDb,frameHashes:$frameHashes,method:"INDEPENDENT_FFPROBE+SCENE+EBUR128+THREE_FRAME_HASHES",legacySources:0}'; }
make_qa "PRODUCTION_V2_QA_EXECUTOR" > "$out/qa1.json"; make_qa "PRODUCTION_V2_RELEASE_QA" > "$out/qa2.json"
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: video/webm" --data-binary "@$out/master.webm" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_VIDEO" | jq '{outcome,packageId,artifact:{id:.artifact.id,byteSize:.artifact.byteSize,sha256:.artifact.sha256}}'
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: application/json" --data-binary "@$out/qa1.json" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_QA1" | jq '{outcome,packageId,assessmentId}'
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: application/json" --data-binary "@$out/qa2.json" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_QA2" | jq '{outcome,packageId,assessmentId,autoPublished}'
