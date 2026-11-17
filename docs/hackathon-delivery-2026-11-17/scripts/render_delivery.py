#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
VOICE_DIR = ROOT / "voice"
CAPTION_DIR = ROOT / "captions"
MEDIA_DIR = ROOT / "media"
WORK_DIR = ROOT / "work"

SOURCE_ROOT = Path(
    "/Users/yanqing/Documents/tapefly-xlayer-local/"
    "tapefly-release-20261024"
)

VIDEO_SOURCES = [
    SOURCE_ROOT / "public" / "tapefly-demo.mp4",
    SOURCE_ROOT / "media" / "promo-v2" / "exports"
    / "tapefly-itch-promo-v7-en-45s-16x9.mp4",
    SOURCE_ROOT / "media" / "promo-v2" / "exports"
    / "tapefly-promo-v6-57s-16x9.mp4",
    SOURCE_ROOT / "steam" / "trailer"
    / "tapefly-steam-coming-soon-1080p.mp4",
]

MUSIC = SOURCE_ROOT / "media" / "promo-v2" / "audio-v4" / "music.wav"

CUES = [
    {
        "chapter": "01 / PROBLEM",
        "en": (
            "Most game characters are black boxes. You can see what they do, "
            "but not why they do it. TapeFly starts with a different promise: "
            "the whole decision layer should be visible, replayable, and provable."
        ),
        "zh": (
            "大多数游戏角色都是黑盒。你能看到它们做了什么，却看不到为什么。"
            "TapeFly 的承诺不同：整个决策层都应该可见、可回放、可证明。"
        ),
    },
    {
        "chapter": "02 / BUILD",
        "en": (
            "TapeFly is a game about building a machine fly. You assemble its "
            "body, place the wings and senses, then wire a brain using only "
            "NAND gates. When the design is ready, you press Fly and let go. "
            "There is no hidden AI endpoint and no personality slider. "
            "The wiring is the character."
        ),
        "zh": (
            "TapeFly 是一款拼装机器果蝇的游戏。玩家组装身体、安装翅膀和感官，"
            "再用 NAND 门连接出大脑。设计完成后按下飞行，松开手。"
            "没有隐藏的 AI 接口，也没有人格滑杆；接线就是角色本身。"
        ),
    },
    {
        "chapter": "03 / PLAY",
        "en": (
            "The fly searches for sugar, avoids walls, and escapes a spider on "
            "its own. The world runs on deterministic physics, so the same "
            "design in the same world always produces the same run. If two "
            "players see the same challenge, they can reproduce exactly the "
            "same result."
        ),
        "zh": (
            "果蝇会自己寻找糖、避开墙并躲开蜘蛛。世界使用确定性物理，"
            "所以同一个设计在同一个世界里总会得到同一次运行。"
            "两个玩家看到同一个挑战，就能复现完全相同的结果。"
        ),
    },
    {
        "chapter": "04 / DIAGNOSE",
        "en": (
            "Failure is where the game begins. When the fly hits a wall, "
            "TapeFly rewinds to the exact tick. You can inspect what it sensed, "
            "which gates fired, and which wire produced the mistake. Change one "
            "connection, compile again, and watch the behavior change."
        ),
        "zh": (
            "失败才是游戏的开始。果蝇撞墙后，TapeFly 会回到出错的那一帧。"
            "你可以检查它感知到了什么、哪些门被触发、哪根线造成了错误。"
            "改一根连接，重新编译，再看行为如何变化。"
        ),
    },
    {
        "chapter": "05 / COMPILE",
        "en": (
            "The editor sits on top of a real compiler. Your wiring becomes "
            "TapeOut-compatible NAND bytes. The compiler does not sample a few "
            "cases. It checks every possible input. For the official twelve-bit "
            "brain, that is four thousand ninety-six cases, and all four "
            "thousand ninety-six must match."
        ),
        "zh": (
            "编辑器下面是一套真实编译器。接线会变成 TapeOut 兼容的 NAND 字节。"
            "它不是抽查几个样例，而是检查每一种可能输入。"
            "官方 12 位大脑共有 4096 种输入，4096 种结果必须全部一致。"
        ),
    },
    {
        "chapter": "06 / X LAYER",
        "en": (
            "The official fifty-gate brain is live on X Layer as Circuit number "
            "two. Its three hundred fifty bytes are stored on chain through an "
            "external TapeOut test processor. Anyone can call the free read-only "
            "eval function and compare every answer. You do not need to trust "
            "our dashboard. You can verify the circuit yourself."
        ),
        "zh": (
            "官方 50 门大脑已经作为 Circuit #2 上线 X Layer。"
            "350 字节通过外部 TapeOut 测试处理器保存在链上。"
            "任何人都可以调用免费只读 eval，比较每一种答案。"
            "你不需要相信我们的面板，可以直接验证电路。"
        ),
    },
    {
        "chapter": "07 / AGENTS",
        "en": (
            "The same task is open to AI agents. An agent can read the Workshop "
            "specification, submit a design, run the measured level, and receive "
            "the complete circuit proof through one API. Human and machine-designed "
            "brains can therefore compete under the same gate budget and the same "
            "deterministic rules."
        ),
        "zh": (
            "同一套任务也向 AI Agent 开放。Agent 可以读取 Workshop 规格、"
            "提交设计、运行关卡，并通过一个 API 获取完整电路证明。"
            "人类和机器设计的大脑因此可以在相同门数预算和相同确定性规则下竞争。"
        ),
    },
    {
        "chapter": "08 / BUSINESS",
        "en": (
            "The business model is built around continued play. Entry is free. "
            "A paid four-week challenge season adds new level packs, verified "
            "rankings, and optional tape-out ownership. Sponsors pay for themed "
            "circuit challenges because they receive real participation and "
            "results that anyone can recompute."
        ),
        "zh": (
            "商业模式围绕持续游玩展开。入门免费；付费四周挑战赛季提供新关卡包、"
            "经过验证的排行榜和可选流片权益。赞助方为主题电路挑战付费，"
            "因为他们获得真实参与和任何人都能复算的结果。"
        ),
    },
    {
        "chapter": "09 / DISTRIBUTION",
        "en": (
            "The first public release is a wallet-free game on the web and itch. "
            "Steam is the next distribution step for traditional players. Later, "
            "the same verified brain can move into desktop hardware. Each channel "
            "brings new users into TapeOut without pretending those future "
            "products are already live."
        ),
        "zh": (
            "首个公开版本是网页和 itch 上的无钱包游戏。Steam 是面向传统玩家的"
            "下一步发行渠道。之后，同一套可验证大脑可以进入桌面硬件。"
            "每个渠道都为 TapeOut 带来新用户，但不会把未来产品说成已经上线。"
        ),
    },
    {
        "chapter": "10 / TAPEFLY",
        "en": "TapeFly. Build a brain. Prove it on-chain.",
        "zh": "TapeFly。搭建大脑，在链上证明。",
    },
]


def run(args: list[str]) -> None:
    print("+", " ".join(str(a) for a in args), flush=True)
    subprocess.run([str(a) for a in args], check=True)


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as src:
        return src.getnframes() / src.getframerate()


def assemble_voice() -> float:
    voice_files = [VOICE_DIR / f"vo-{i:02d}.wav" for i in range(1, 11)]
    with wave.open(str(voice_files[0]), "rb") as first:
        params = first.getparams()

    if params.nchannels != 1 or params.sampwidth != 2 or params.framerate != 48_000:
        raise RuntimeError(f"Unexpected voice format: {params}")

    lead_seconds = 0.5
    gap_seconds = 0.8
    lead_frames = int(params.framerate * lead_seconds)
    gap_frames = int(params.framerate * gap_seconds)

    timing = []
    current_seconds = lead_seconds
    output = WORK_DIR / "voice-track.wav"

    with wave.open(str(output), "wb") as dst:
        dst.setparams(params)
        dst.writeframes(b"\x00\x00" * lead_frames)

        for index, voice_file in enumerate(voice_files):
            with wave.open(str(voice_file), "rb") as src:
                if src.getparams()[:3] != params[:3]:
                    raise RuntimeError(f"Voice format mismatch: {voice_file}")
                frames = src.readframes(src.getnframes())

            dst.writeframes(frames)
            duration = len(frames) / (params.framerate * params.sampwidth)
            timing.append(
                {
                    "index": index + 1,
                    "start": current_seconds,
                    "end": current_seconds + duration,
                    "duration": duration,
                    **CUES[index],
                }
            )
            current_seconds += duration
            if index < len(voice_files) - 1:
                dst.writeframes(b"\x00\x00" * gap_frames)
                current_seconds += gap_seconds

        dst.writeframes(b"\x00\x00" * int(params.framerate * 1.2))

    video_duration = timing[-1]["end"] + 1.2
    manifest = {
        "voice_track": str(output),
        "video_duration": video_duration,
        "cue_count": len(timing),
        "cues": timing,
    }
    (CAPTION_DIR / "timing.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return video_duration


def srt_time(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_srt(timing: list[dict], bilingual: bool) -> Path:
    path = CAPTION_DIR / (
        "tapefly-demo-bilingual-3min.srt"
        if bilingual
        else "tapefly-demo-en-3min.srt"
    )
    blocks = []
    for cue in timing:
        text = f"{cue['en']}\n{cue['zh']}" if bilingual else cue["en"]
        blocks.append(
            f"{cue['index']}\n"
            f"{srt_time(cue['start'])} --> {srt_time(cue['end'])}\n"
            f"{text}\n"
        )
    path.write_text("\n".join(blocks), encoding="utf-8")
    return path


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    fallback = "/System/Library/Fonts/Supplemental/Arial.ttf"
    chosen = Path(path)
    return ImageFont.truetype(str(chosen if chosen.exists() else fallback), size)


def wrap(draw: ImageDraw.ImageDraw, text: str, face, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), candidate, font=face)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def cue_image(
    cue: dict, vertical: bool
) -> tuple[Image.Image, tuple[int, int]]:
    if vertical:
        panel_w, panel_h = 972, 400
        panel_x, panel_y = 54, 1450
        label_face = font("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28)
        body_face = font("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 38)
        max_text_width = 860
        label_y = 38
        body_y = 92
        line_height = 48
    else:
        panel_w, panel_h = 1680, 250
        panel_x, panel_y = 120, 775
        label_face = font("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 24)
        body_face = font("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 43)
        max_text_width = 1530
        label_y = 28
        body_y = 73
        line_height = 52

    image = Image.new("RGBA", (panel_w, panel_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (0, 0, panel_w - 1, panel_h - 1),
        radius=22,
        fill=(7, 16, 22, 220),
        outline=(99, 231, 192, 180),
        width=2,
    )
    draw.rounded_rectangle(
        (
            22,
            20,
            28,
            panel_h - 20,
        ),
        radius=3,
        fill=(99, 231, 192, 255),
    )

    draw.text(
        (48, label_y),
        cue["chapter"],
        font=label_face,
        fill=(99, 231, 192, 255),
    )

    lines = wrap(draw, cue["en"], body_face, max_text_width)
    for line in lines[:4]:
        draw.text(
            (48, body_y),
            line,
            font=body_face,
            fill=(250, 250, 245, 255),
            stroke_width=1,
            stroke_fill=(0, 0, 0, 160),
        )
        body_y += line_height

    return image, (panel_x, panel_y)


def write_caption_images(
    timing: list[dict]
) -> tuple[list[dict], list[dict]]:
    cue_dir = CAPTION_DIR / "png"
    cue_dir.mkdir(parents=True, exist_ok=True)
    landscape = []
    vertical = []
    for cue in timing:
        landscape_path = cue_dir / f"cue-{cue['index']:02d}-16x9.png"
        vertical_path = cue_dir / f"cue-{cue['index']:02d}-9x16.png"
        landscape_image, landscape_position = cue_image(cue, False)
        vertical_image, vertical_position = cue_image(cue, True)
        landscape_image.save(landscape_path)
        vertical_image.save(vertical_path)
        landscape.append({"path": landscape_path, "position": landscape_position})
        vertical.append({"path": vertical_path, "position": vertical_position})
    return landscape, vertical


def build_clean_master(voice_duration: float) -> Path:
    output = WORK_DIR / "base-16x9-clean.mp4"
    video_duration = voice_duration

    filter_parts = []
    concat_inputs = []
    for index in range(4):
        filter_parts.append(
            f"[{index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,"
            f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,"
            f"format=yuv420p[v{index}]"
        )
        concat_inputs.append(f"[v{index}]")

    filter_parts.append(
        "".join(concat_inputs)
        + f"concat=n=4:v=1:a=0,trim=duration={video_duration:.3f},"
        "setpts=PTS-STARTPTS[vbase]"
    )
    filter_parts.append(
        f"[4:a]atrim=duration={video_duration:.3f},asetpts=PTS-STARTPTS,"
        "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=8:release=120[voice]"
    )
    filter_parts.append(
        f"[5:a]atrim=duration={video_duration:.3f},asetpts=PTS-STARTPTS,"
        "volume=0.13,afade=t=in:st=0:d=2,"
        f"afade=t=out:st={max(0, video_duration - 4):.3f}:d=4[music]"
    )
    filter_parts.append(
        "[voice][music]amix=inputs=2:duration=longest:normalize=0,"
        "loudnorm=I=-16:LRA=11:TP=-1.5[aout]"
    )

    args = ["ffmpeg", "-y"]
    for source in VIDEO_SOURCES:
        args += ["-i", str(source)]
    args += [
        "-i",
        str(WORK_DIR / "voice-track.wav"),
        "-stream_loop",
        "-1",
        "-i",
        str(MUSIC),
        "-filter_complex",
        ";".join(filter_parts),
        "-map",
        "[vbase]",
        "-map",
        "[aout]",
        "-t",
        f"{video_duration:.3f}",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "19",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        str(output),
    ]
    run(args)
    return output


def overlay_command(
    clean_master: Path,
    images: list[dict],
    timing: list[dict],
    srt: Path,
    output: Path,
    vertical: bool,
    video_duration: float,
) -> None:
    args = ["ffmpeg", "-y", "-i", str(clean_master)]
    for image in images:
        args += ["-loop", "1", "-framerate", "1", "-i", str(image["path"])]
    args += ["-i", str(srt)]

    filter_parts = []
    last = "base"
    if vertical:
        filter_parts.append(
            "[0:v]crop=608:1080:(iw-608)/2:0,"
            "scale=1080:1920,setsar=1[base]"
        )
    else:
        filter_parts.append("[0:v]setpts=PTS-STARTPTS[base]")

    for index, cue in enumerate(timing):
        image_index = index + 1
        new_label = f"cap{index + 1}"
        start = max(0, cue["start"] - 0.15)
        end = cue["end"] + 0.2
        x, y = images[index]["position"]
        filter_parts.append(
            f"[{last}][{image_index}:v]overlay={x}:{y}:"
            f"enable='between(t,{start:.3f},{end:.3f})'[{new_label}]"
        )
        last = new_label

    srt_index = len(images) + 1
    args += [
        "-filter_complex",
        ";".join(filter_parts),
        "-map",
        f"[{last}]",
        "-map",
        "0:a",
        "-map",
        f"{srt_index}:s",
        "-c:v",
        "libx264",
        "-preset",
        "medium" if not vertical else "veryfast",
        "-crf",
        "20" if not vertical else "22",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-c:s",
        "mov_text",
        "-metadata:s:s:0",
        "language=eng",
        "-t",
        f"{video_duration:.3f}",
        "-movflags",
        "+faststart",
        str(output),
    ]
    run(args)


def main() -> None:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    CAPTION_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    timing_path = CAPTION_DIR / "timing.json"
    voice_track = WORK_DIR / "voice-track.wav"
    if timing_path.exists() and voice_track.exists():
        manifest = json.loads(timing_path.read_text(encoding="utf-8"))
        duration = float(manifest["video_duration"])
        timing = manifest["cues"]
    else:
        duration = assemble_voice()
        timing = json.loads(
            timing_path.read_text(encoding="utf-8")
        )["cues"]
    en_srt = write_srt(timing, bilingual=False)
    write_srt(timing, bilingual=True)
    landscape_images, vertical_images = write_caption_images(timing)

    clean = WORK_DIR / "base-16x9-clean.mp4"
    if not clean.exists():
        clean = build_clean_master(duration)
    landscape_output = MEDIA_DIR / "tapefly-demo-en-3min-16x9.mp4"
    if not landscape_output.exists() or landscape_output.stat().st_size < 1_000_000:
        overlay_command(
            clean,
            landscape_images,
            timing,
            en_srt,
            landscape_output,
            vertical=False,
            video_duration=duration,
        )
    vertical_output = MEDIA_DIR / "tapefly-demo-en-3min-9x16.mp4"
    if not vertical_output.exists() or vertical_output.stat().st_size < 1_000_000:
        overlay_command(
            clean,
            vertical_images,
            timing,
            en_srt,
            vertical_output,
            vertical=True,
            video_duration=duration,
        )

    print(f"Done. Duration: {duration:.3f}s")


if __name__ == "__main__":
    main()
