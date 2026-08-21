#!/usr/bin/env python3
"""Synthesize one narration clip with Edge-TTS and keep the engine's word timings.

Why this exists: the `edge-tts` CLI aggregates `--write-subtitles` into one cue per
sentence, and re-deriving word timings afterwards with ASR would both cost a model
download and risk mis-transcribing zh-Hant. The synthesis stream already carries exact
`WordBoundary` events, so we take the audio and the timings in a single pass.

Used by `hf tts`; safe to run by hand:

    python shared/tools/edge_tts_words.py --text-file slide-01.tts.txt \\
        --voice zh-TW-HsiaoChenNeural --rate +5% --pitch -3Hz --volume +0% \\
        --out-audio slide-01.mp3 --out-words slide-01.words.json

Writes the MP3 and a words file:

    {"voice": "...", "words": [{"t": 0.1125, "d": 0.2375, "w": "這"}, ...]}

`t`/`d` are seconds from the start of this clip. Exit codes: 0 ok, 2 edge-tts missing,
1 synthesis failed.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--text-file", required=True)
    p.add_argument("--voice", required=True)
    p.add_argument("--rate", default="+0%")
    p.add_argument("--pitch", default="+0Hz")
    p.add_argument("--volume", default="+0%")
    p.add_argument("--out-audio", required=True)
    p.add_argument("--out-words", required=True)
    return p.parse_args()


async def synth(a: argparse.Namespace) -> int:
    import edge_tts  # imported late so a missing package exits 2, not a traceback

    with open(a.text_file, encoding="utf-8-sig") as fh:
        text = fh.read().strip()
    if not text:
        print("hf: empty TTS text", file=sys.stderr)
        return 1

    # boundary defaults to SentenceBoundary in edge-tts 7.x, which collapses a whole
    # sentence into one cue; WordBoundary is what carries per-word timings.
    comm = edge_tts.Communicate(
        text, a.voice, rate=a.rate, pitch=a.pitch, volume=a.volume, boundary="WordBoundary"
    )
    words: list[dict] = []
    with open(a.out_audio, "wb") as out:
        async for chunk in comm.stream():
            kind = chunk.get("type")
            if kind == "audio":
                out.write(chunk["data"])
            elif kind == "WordBoundary":
                # edge-tts reports 100-nanosecond ticks
                words.append(
                    {
                        "t": round(chunk["offset"] / 1e7, 4),
                        "d": round(chunk["duration"] / 1e7, 4),
                        "w": chunk["text"],
                    }
                )
    payload = {
        "voice": a.voice,
        "rate": a.rate,
        "pitch": a.pitch,
        "volume": a.volume,
        "source": a.text_file.replace("\\", "/").rsplit("/", 1)[-1],
        "words": words,
    }
    with open(a.out_words, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False)
    print(f"{len(words)} word boundaries")
    return 0


def main() -> int:
    a = parse_args()
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("hf: edge-tts not installed (pip install --user edge-tts)", file=sys.stderr)
        return 2
    try:
        return asyncio.run(synth(a))
    except Exception as exc:  # network hiccup, bad voice, refused connection
        print(f"hf: edge-tts synthesis failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
