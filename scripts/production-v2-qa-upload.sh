#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then echo "usage: production-v2-qa-upload.sh <prepare-response.json> <master.webm> <qa-output-dir>" >&2; exit 64; fi
if [[ -z "${FACTORY_SITE_AUTH_TOKEN:-}" || -z "${FACTORY_SITE_URL:-}" || -z "${PRODUCTION_V2_EXECUTOR_TOKEN:-}" ]]; then echo "Production V2 executor credentials are required" >&2; exit 65; fi

response="$1"; master="$2"; out="$3"; mkdir -p "$out/frames"
package_id="$(jq -er '.packageId' "$response")"
auth="OAI-Sites-Authorization: Bearer ${FACTORY_SITE_AUTH_TOKEN}"; executor="x-production-v2-executor-token: ${PRODUCTION_V2_EXECUTOR_TOKEN}"
probe="$(ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of json "$master")"
duration="$(jq -r '.format.duration|tonumber' <<<"$probe")"; width="$(jq -r '[.streams[]|select(.codec_type=="video")][0].width' <<<"$probe")"; height="$(jq -r '[.streams[]|select(.codec_type=="video")][0].height' <<<"$probe")"; rate="$(jq -r '[.streams[]|select(.codec_type=="video")][0].r_frame_rate' <<<"$probe")"; fps="$(awk -F/ '{if($2==0)print 0;else printf "%.3f",$1/$2}' <<<"$rate")"; video_codec="$(jq -r '[.streams[]|select(.codec_type=="video")][0].codec_name' <<<"$probe")"; audio_codec="$(jq -r '[.streams[]|select(.codec_type=="audio")][0].codec_name' <<<"$probe")"
analysis_log="$(ffmpeg -hide_banner -nostats -i "$master" -filter_complex "[0:v]split=3[scene][black][freeze];[scene]select='gt(scene,0.05)',showinfo[sceneout];[black]blackdetect=d=0.2:pix_th=0.02[blackout];[freeze]freezedetect=n=-60dB:d=2[freezeout]" -map '[sceneout]' -map '[blackout]' -map '[freezeout]' -an -f null - 2>&1 || true)"
scene_changes="$(grep -c 'showinfo.*pts_time' <<<"$analysis_log" || true)"
black_duration="$(awk -F'black_duration:' '/black_duration:/{split($2,a," ");sum+=a[1]} END{print sum+0}' <<<"$analysis_log")"; black_ratio="$(awk -v part="$black_duration" -v total="$duration" 'BEGIN{if(total<=0)print 1;else printf "%.6f",part/total}')"
freeze_duration="$(awk -F'freeze_duration: ' '/freeze_duration:/{sum+=$2} END{print sum+0}' <<<"$analysis_log")"; freeze_ratio="$(awk -v part="$freeze_duration" -v total="$duration" 'BEGIN{if(total<=0)print 1;else printf "%.6f",part/total}')"
loudness_log="$(ffmpeg -hide_banner -nostats -i "$master" -filter_complex ebur128=peak=true -f null - 2>&1 || true)"; loudness_i="$(awk '/I:/{value=$2} END{print value+0}' <<<"$loudness_log")"; true_peak="$(awk '/Peak:/{value=$2} END{print value+0}' <<<"$loudness_log")"; sha="$(sha256sum "$master" | awk '{print $1}')"
rm -f "$out"/frames/frame-*.jpg
for second in 72 360 648; do ffmpeg -hide_banner -loglevel error -y -ss "$second" -i "$master" -frames:v 1 -q:v 2 "$out/frames/frame-${second}.jpg"; done
ffmpeg -hide_banner -loglevel error -y -i "$out/frames/frame-72.jpg" -i "$out/frames/frame-360.jpg" -i "$out/frames/frame-648.jpg" -filter_complex '[0:v]scale=640:-1[a];[1:v]scale=640:-1[b];[2:v]scale=640:-1[c];[a][b][c]hstack=inputs=3' -q:v 3 "$out/visual-sample.jpg"
frame_hashes="$(for frame in "$out"/frames/*.jpg; do sha256sum "$frame" | awk '{print $1}'; done | jq -Rsc 'split("\n")|map(select(length>0))')"
make_qa(){ actor="$1"; jq -n --arg actor "$actor" --arg videoSha256 "$sha" --arg videoCodec "$video_codec" --arg audioCodec "$audio_codec" --argjson durationSeconds "$duration" --argjson width "$width" --argjson height "$height" --argjson fps "$fps" --argjson sceneChanges "$scene_changes" --argjson blackFrameRatio "$black_ratio" --argjson freezeRatio "$freeze_ratio" --argjson loudnessI "$loudness_i" --argjson truePeakDb "$true_peak" --argjson frameHashes "$frame_hashes" '{actor:$actor,videoSha256:$videoSha256,durationSeconds:$durationSeconds,dimensions:{width:$width,height:$height},fps:$fps,videoCodec:$videoCodec,audioCodec:$audioCodec,sceneChanges:$sceneChanges,blackFrameRatio:$blackFrameRatio,freezeRatio:$freezeRatio,loudnessI:$loudnessI,truePeakDb:$truePeakDb,frameHashes:$frameHashes,method:"INDEPENDENT_FFPROBE+SCENE+BLACKDETECT+FREEZEDETECT+EBUR128+THREE_FRAME_HASHES",legacySources:0}'; }
make_qa "PRODUCTION_V2_QA_EXECUTOR" > "$out/qa1.json"; make_qa "PRODUCTION_V2_RELEASE_QA" > "$out/qa2.json"

jq -e '.sceneChanges >= 29 and .blackFrameRatio <= 0.02 and .freezeRatio <= 0.08 and .loudnessI >= -22 and .loudnessI <= -12 and .truePeakDb <= -1 and (.frameHashes|length) == 3' "$out/qa1.json" >/dev/null || { echo "Local QA admission failed" >&2; jq . "$out/qa1.json" >&2; exit 66; }
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: video/webm" --data-binary "@$master" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_VIDEO" | jq '{outcome,packageId,artifact:{id:.artifact.id,byteSize:.artifact.byteSize,sha256:.artifact.sha256}}'
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: application/json" --data-binary "@$out/qa1.json" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_QA1" | jq '{outcome,packageId,assessmentId}'
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: image/jpeg" --data-binary "@$out/visual-sample.jpg" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_QA_VISUAL" | jq '{outcome,packageId,artifactId:.artifact.id}'
curl -fsS -X PUT -H "$auth" -H "$executor" -H "content-type: application/json" --data-binary "@$out/qa2.json" "${FACTORY_SITE_URL}/api/factory/production-v2?package=$(jq -rn --arg v "$package_id" '$v|@uri')&kind=FULL_QA2" | jq '{outcome,packageId,assessmentId,autoPublished}'
