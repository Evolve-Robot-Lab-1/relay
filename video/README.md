# Relay hackathon video

The edit uses the seven numbered narration clips in order, the main Relay product recording, the Codex terminal recording, and the supplied artwork.

Build the captioned 1080p MP4:

```bash
bash video/build_hackathon_video.sh
```

The default output is `video/output/relay-hackathon-final.mp4`. The source-media directory and output path can be overridden with the first and second arguments.

The build produces:

- H.264 video at 1920×1080 and 30 fps
- normalized 48 kHz stereo AAC narration
- burned-in captions from `relay_hackathon.srt`
- a JPEG thumbnail beside the final MP4

No background music is added because none was supplied.
