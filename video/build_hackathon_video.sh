#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-/home/evolve/Documents/relay_pic_vid/video}"
OUTPUT_FILE="${2:-$REPO_ROOT/video/output/relay-hackathon-final.mp4}"
PICTURE_DIR="$SOURCE_DIR/pics"
AUDIO_DIR="$SOURCE_DIR/audio"
RECORDING_DIR="$SOURCE_DIR/reecord"
SUBTITLE_FILE="$REPO_ROOT/video/relay_hackathon.srt"
FONT_REGULAR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TOTAL_DURATION="100.909502"

command -v ffmpeg >/dev/null
command -v ffprobe >/dev/null

required_files=(
  "$PICTURE_DIR/relay-mark.png"
  "$PICTURE_DIR/2s.png"
  "$PICTURE_DIR/3e.png"
  "$PICTURE_DIR/4s.png"
  "$PICTURE_DIR/5s.png"
  "$PICTURE_DIR/6s.png"
  "$PICTURE_DIR/6e.png"
  "$RECORDING_DIR/1.webm"
  "$RECORDING_DIR/2.webm"
  "$SUBTITLE_FILE"
  "$FONT_REGULAR"
  "$FONT_BOLD"
)
for relay_audio_number in 1 2 3 4 5 6 7; do
  required_files+=("$AUDIO_DIR/$relay_audio_number.mp3")
done
for relay_required_file in "${required_files[@]}"; do
  if [[ ! -f "$relay_required_file" ]]; then
    echo "Missing required asset: $relay_required_file" >&2
    exit 1
  fi
done

mkdir -p "$(dirname "$OUTPUT_FILE")"
WORK_DIR="$(mktemp -d /tmp/relay-video-build.XXXXXX)"
cleanup_relay_video_build() {
  case "$WORK_DIR" in
    /tmp/relay-video-build.*) rm -rf -- "$WORK_DIR" ;;
  esac
}
trap cleanup_relay_video_build EXIT

encode_video=(
  -an -c:v libx264 -preset medium -crf 14
  -pix_fmt yuv420p -r 30 -movflags +faststart
)

render_still() {
  local relay_image="$1"
  local relay_duration="$2"
  local relay_output="$3"
  local relay_label="${4:-}"
  local relay_label_filter=""
  if [[ -n "$relay_label" ]]; then
    relay_label_filter=",drawtext=fontfile='${FONT_BOLD}':text='${relay_label}':x=70:y=62:fontsize=38:fontcolor=white:box=1:boxcolor=black@0.68:boxborderw=18"
  fi
  ffmpeg -hide_banner -loglevel error -y \
    -loop 1 -framerate 30 -t "$relay_duration" -i "$relay_image" \
    -filter_complex "[0:v]split=2[relay_bg_source][relay_fg_source];[relay_bg_source]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=24:2,eq=brightness=-0.30:saturation=0.72[relay_bg];[relay_fg_source]scale=1920:1080:force_original_aspect_ratio=decrease[relay_fg];[relay_bg][relay_fg]overlay=(W-w)/2:(H-h)/2,zoompan=z='min(1.0+0.00013*on,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,setsar=1${relay_label_filter}[relay_out]" \
    -map "[relay_out]" -t "$relay_duration" "${encode_video[@]}" "$relay_output"
}

render_brand_card() {
  local relay_duration="$1"
  local relay_output="$2"
  local relay_show_url="${3:-0}"
  local relay_url_filter=""
  if [[ "$relay_show_url" == "1" ]]; then
    relay_url_filter=",drawtext=fontfile='${FONT_BOLD}':text='relay.durgaai.com':x=(w-text_w)/2:y=812:fontsize=38:fontcolor=0x79f29a"
  fi
  ffmpeg -hide_banner -loglevel error -y \
    -loop 1 -framerate 30 -t "$relay_duration" -i "$PICTURE_DIR/relay-mark.png" \
    -filter_complex "color=c=0x070b09:s=1920x1080:r=30:d=${relay_duration}[relay_brand_bg];[0:v]scale=480:480[relay_brand_mark];[relay_brand_bg][relay_brand_mark]overlay=(W-w)/2:72,drawtext=fontfile='${FONT_BOLD}':text='RELAY':x=(w-text_w)/2:y=595:fontsize=92:fontcolor=white,drawtext=fontfile='${FONT_REGULAR}':text='SAY IT BETTER':x=(w-text_w)/2:y=720:fontsize=34:fontcolor=0xe8b55b${relay_url_filter}[relay_brand]" \
    -map "[relay_brand]" -t "$relay_duration" "${encode_video[@]}" "$relay_output"
}

echo "Rendering cinematic opening..."
render_brand_card 3.200000 "$WORK_DIR/01-title.mp4"
render_still "$PICTURE_DIR/3e.png" 3.000000 "$WORK_DIR/02-avoid.mp4" "THE CONVERSATIONS WE AVOID"
render_still "$PICTURE_DIR/4s.png" 2.700000 "$WORK_DIR/03-money.mp4" "ASKING FOR MONEY"
render_still "$PICTURE_DIR/5s.png" 2.700000 "$WORK_DIR/04-meeting.mp4" "ARRANGING A MEETING"
render_still "$PICTURE_DIR/6s.png" 2.938125 "$WORK_DIR/05-decline.mp4" "DECLINING POLITELY"

echo "Rendering privacy and approval sequence..."
render_still "$PICTURE_DIR/6s.png" 4.800000 "$WORK_DIR/06-private.mp4" "PRIVATE INTENT"
render_still "$PICTURE_DIR/6e.png" 5.189125 "$WORK_DIR/07-approval.mp4" "CLEAR DRAFT  ·  HUMAN APPROVAL"

echo "Rendering live product demo..."
ffmpeg -hide_banner -loglevel error -y \
  -i "$RECORDING_DIR/1.webm" \
  -filter_complex "[0:v]split=3[relay_create_source][relay_draft_source][relay_invite_source];[relay_create_source]trim=start=0.2:end=13.7,setpts=(4.2/13.5)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='PRIVATE GOAL':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_create];[relay_draft_source]trim=start=14.6:end=24.9,setpts=(4.4/10.3)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='REVIEW AND CHOOSE A TONE':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_draft];[relay_invite_source]trim=start=25.2:end=34.9,setpts=(3.583438/9.7)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='APPROVE  ·  CREATE SECURE INVITE':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_invite];[relay_create][relay_draft][relay_invite]concat=n=3:v=1:a=0[relay_demo_one]" \
  -map "[relay_demo_one]" -t 12.183438 "${encode_video[@]}" "$WORK_DIR/08-demo-one.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -i "$RECORDING_DIR/1.webm" \
  -filter_complex "[0:v]split=6[relay_join_source][relay_peer_source][relay_private_source][relay_time_source][relay_confirm_source][relay_outcome_source];[relay_join_source]trim=start=39.4:end=46.5,setpts=(4.3/7.1)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='SECURE TWO-PERSON JOIN':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_join];[relay_peer_source]trim=start=48:end=61.9,setpts=(4.0/13.9)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='THE OTHER PERSON REPLIES':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_peer];[relay_private_source]trim=start=63.7:end=69,setpts=(3.5/5.3)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='ONLY THE AUTHOR SEES THE PRIVATE ORIGINAL':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_private];[relay_time_source]trim=start=72:end=84.8,setpts=(3.5/12.8)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='STATUS  ·  PROPOSED':x=70:y=62:fontsize=34:fontcolor=0xe8b55b:box=1:boxcolor=black@0.65:boxborderw=16[relay_time];[relay_confirm_source]trim=start=93:end=102,setpts=(2.5/9)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='THE PEER EXPLICITLY CONFIRMS':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_confirm];[relay_outcome_source]trim=start=113.6:end=117.3,setpts=(1.48875/3.7)*(PTS-STARTPTS),fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawtext=fontfile='${FONT_BOLD}':text='AGREED  ·  AFTER CONFIRMATION':x=70:y=62:fontsize=34:fontcolor=0x79f29a:box=1:boxcolor=black@0.65:boxborderw=16[relay_outcome];[relay_join][relay_peer][relay_private][relay_time][relay_confirm][relay_outcome]concat=n=6:v=1:a=0[relay_demo_two]" \
  -map "[relay_demo_two]" -t 19.288750 "${encode_video[@]}" "$WORK_DIR/09-demo-two.mp4"

echo "Rendering trust principles..."
render_still "$PICTURE_DIR/6s.png" 5.100562 "$WORK_DIR/10-commitment.mp4" "COMMITMENTS REQUIRE CONFIRMATION"
render_still "$PICTURE_DIR/3e.png" 2.450000 "$WORK_DIR/11-silence.mp4" "SILENCE IS NOT YES"
render_still "$PICTURE_DIR/2s.png" 3.196126 "$WORK_DIR/11-suggestion.mp4" "A SUGGESTION IS NOT AN AGREEMENT"

echo "Rendering Codex build sequence..."
ffmpeg -hide_banner -loglevel error -y \
  -i "$RECORDING_DIR/2.webm" \
  -filter_complex "[0:v]setpts=(26.211188/28.669364)*(PTS-STARTPTS),fps=30,crop=900:363:0:0,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b09,setsar=1,drawbox=x=0:y=0:w=iw:h=150:color=0x070b09@0.96:t=fill,drawtext=fontfile='${FONT_BOLD}':text='BUILT WITH CODEX + GPT-5.6':x=(w-text_w)/2:y=42:fontsize=46:fontcolor=white,drawtext=fontfile='${FONT_REGULAR}':text='State model  ·  invite flow  ·  real-time chat  ·  privacy boundaries':x=(w-text_w)/2:y=105:fontsize=25:fontcolor=0x79f29a[relay_codex]" \
  -map "[relay_codex]" -t 26.211188 "${encode_video[@]}" "$WORK_DIR/12-codex.mp4"

echo "Rendering closing card..."
render_brand_card 7.952188 "$WORK_DIR/13-closing.mp4" 1

echo "Building and normalizing narration..."
ffmpeg -hide_banner -loglevel error -y \
  -i "$AUDIO_DIR/1.mp3" -i "$AUDIO_DIR/2.mp3" -i "$AUDIO_DIR/3.mp3" \
  -i "$AUDIO_DIR/4.mp3" -i "$AUDIO_DIR/5.mp3" -i "$AUDIO_DIR/6.mp3" \
  -i "$AUDIO_DIR/7.mp3" \
  -filter_complex "[0:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0];[1:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a1];[2:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a2];[3:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a3];[4:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a4];[5:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a5];[6:a]highpass=f=70,acompressor=threshold=0.0794:ratio=2.5:attack=12:release=120:makeup=1.5,loudnorm=I=-21:TP=-3:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a6];anullsrc=r=48000:cl=stereo:d=0.5[lead];anullsrc=r=48000:cl=stereo:d=0.35[g1];anullsrc=r=48000:cl=stereo:d=0.35[g2];anullsrc=r=48000:cl=stereo:d=0.35[g3];anullsrc=r=48000:cl=stereo:d=0.35[g4];anullsrc=r=48000:cl=stereo:d=0.35[g5];anullsrc=r=48000:cl=stereo:d=0.35[g6];anullsrc=r=48000:cl=stereo:d=1.5[outro];[lead][a0][g1][a1][g2][a2][g3][a3][g4][a4][g5][a5][g6][a6][outro]concat=n=15:v=0:a=1[relay_audio]" \
  -map "[relay_audio]" -ar 48000 -c:a pcm_f32le "$WORK_DIR/narration-pre.wav"

ffmpeg -hide_banner -nostats -i "$WORK_DIR/narration-pre.wav" \
  -af loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json -f null - \
  2> "$WORK_DIR/loudnorm-pass1.log"

relay_measured_i="$(sed -n 's/.*"input_i"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$WORK_DIR/loudnorm-pass1.log" | tail -n 1)"
relay_measured_tp="$(sed -n 's/.*"input_tp"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$WORK_DIR/loudnorm-pass1.log" | tail -n 1)"
relay_measured_lra="$(sed -n 's/.*"input_lra"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$WORK_DIR/loudnorm-pass1.log" | tail -n 1)"
relay_measured_thresh="$(sed -n 's/.*"input_thresh"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$WORK_DIR/loudnorm-pass1.log" | tail -n 1)"
relay_offset="$(sed -n 's/.*"target_offset"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$WORK_DIR/loudnorm-pass1.log" | tail -n 1)"

if [[ -n "$relay_measured_i" && -n "$relay_measured_tp" && -n "$relay_measured_lra" && -n "$relay_measured_thresh" && -n "$relay_offset" ]]; then
  ffmpeg -hide_banner -loglevel error -y -i "$WORK_DIR/narration-pre.wav" \
    -af "loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=${relay_measured_i}:measured_TP=${relay_measured_tp}:measured_LRA=${relay_measured_lra}:measured_thresh=${relay_measured_thresh}:offset=${relay_offset}:linear=true" \
    -ar 48000 -ac 2 -c:a pcm_s16le "$WORK_DIR/narration-master.wav"
else
  ffmpeg -hide_banner -loglevel error -y -i "$WORK_DIR/narration-pre.wav" \
    -af "loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 -ac 2 -c:a pcm_s16le \
    "$WORK_DIR/narration-master.wav"
fi

echo "Assembling final 1080p video with captions..."
video_segments=(
  "$WORK_DIR/01-title.mp4"
  "$WORK_DIR/02-avoid.mp4"
  "$WORK_DIR/03-money.mp4"
  "$WORK_DIR/04-meeting.mp4"
  "$WORK_DIR/05-decline.mp4"
  "$WORK_DIR/06-private.mp4"
  "$WORK_DIR/07-approval.mp4"
  "$WORK_DIR/08-demo-one.mp4"
  "$WORK_DIR/09-demo-two.mp4"
  "$WORK_DIR/10-commitment.mp4"
  "$WORK_DIR/11-silence.mp4"
  "$WORK_DIR/11-suggestion.mp4"
  "$WORK_DIR/12-codex.mp4"
  "$WORK_DIR/13-closing.mp4"
)
relay_video_inputs=()
relay_concat_inputs=""
for relay_segment_index in "${!video_segments[@]}"; do
  relay_video_inputs+=( -i "${video_segments[$relay_segment_index]}" )
  relay_concat_inputs+="[${relay_segment_index}:v]"
done
relay_video_segment_count="${#video_segments[@]}"

ffmpeg -hide_banner -loglevel error -y \
  "${relay_video_inputs[@]}" -i "$WORK_DIR/narration-master.wav" \
  -filter_complex "${relay_concat_inputs}concat=n=${relay_video_segment_count}:v=1:a=0,fade=t=in:st=0:d=0.5,fade=t=out:st=100.109502:d=0.8,subtitles=filename='${SUBTITLE_FILE}':force_style='FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00FFFFFF,BackColour=&H90000000,BorderStyle=3,Outline=0,Shadow=0,Alignment=2,MarginV=44'[relay_final_video]" \
  -map "[relay_final_video]" -map "${relay_video_segment_count}:a:0" -t "$TOTAL_DURATION" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart \
  -metadata title="Relay - Say it better" \
  -metadata comment="OpenAI Build Week hackathon demo" \
  "$OUTPUT_FILE"

ffmpeg -hide_banner -loglevel error -y -ss 1.8 -i "$WORK_DIR/01-title.mp4" \
  -frames:v 1 -q:v 2 "${OUTPUT_FILE%.mp4}-thumbnail.jpg"

echo "Finished: $OUTPUT_FILE"
ffprobe -v error \
  -show_entries format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of default=noprint_wrappers=1 "$OUTPUT_FILE"
