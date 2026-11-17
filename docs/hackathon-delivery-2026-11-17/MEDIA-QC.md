# Media QC

Checked on 2026-11-17.

## 16:9 master

| Field | Result |
|---|---|
| File | `media/tapefly-demo-en-3min-16x9.mp4` |
| Resolution | 1920 × 1080 |
| Frame rate | 30 fps |
| Duration | 170.23 seconds / 2:50 |
| Video | H.264 High |
| Audio | AAC, English narration + music |
| Integrated loudness | -15.9 LUFS |
| True peak | -1.5 dBFS |
| Captions | Burned-in English panels + English soft subtitle track |
| File size | about 42 MB |

## 9:16 derivative

| Field | Result |
|---|---|
| File | `media/tapefly-demo-en-3min-9x16.mp4` |
| Resolution | 1080 × 1920 |
| Frame rate | 30 fps |
| Duration | 170.23 seconds / 2:50 |
| Video | H.264 High, center crop |
| Audio | AAC, same mix as master |
| Captions | Burned-in English panels + English soft subtitle track |
| File size | about 25 MB |

## Checks

- Both files decode without audio errors.
- Caption overlays appear at the tested 16:9 and 9:16 timestamps.
- Caption timing is generated from measured voice-clip durations.
- English and bilingual SRT files are included.
- Final duration is below the three-minute limit.
- No claim is made that Steam, physical hardware or a stateful Workshop tape-out is already live.
