#!/usr/bin/env python3
"""Generate transcripts for ChinaTalk episodes that don't have one.

Works through episodes that build_data.py could not match to a published
transcript post, newest first by default. For each: download the audio
from the podcast feed enclosure, transcribe, and write
raw/transcripts/ep{n}.json. Fully resumable — finished episodes are
skipped, so run it as many times as you like, then re-run build_data.py
to fold the new text into the site's corpus.

Backends:
  * local faster-whisper (default; --model base.en/small.en/...)
  * OpenAI transcription API when --openai is passed and OPENAI_API_KEY
    is set (much faster than CPU, costs ~$0.006/audio-minute)

Usage:
  python3 transcribe.py --limit 5              # five newest missing episodes
  python3 transcribe.py --order shortest       # cheapest first
  python3 transcribe.py --openai --limit 50
"""

import argparse
import json
import os
import tempfile
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
OUT = HERE / "raw" / "transcripts"
UA = {"User-Agent": "Mozilla/5.0 (chinatalk-analytics transcriber)"}


def missing_episodes(order):
    episodes = json.loads((DATA / "episodes.json").read_text())
    todo = [
        e for e in episodes
        if not e.get("tr") and e.get("audio")
        and not (OUT / f"ep{e['n']:04d}.json").exists()
    ]
    if order == "newest":
        todo.sort(key=lambda e: e["date"], reverse=True)
    elif order == "oldest":
        todo.sort(key=lambda e: e["date"])
    elif order == "shortest":
        todo.sort(key=lambda e: e["duration"])
    return todo


def download_audio(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)


def transcribe_local(path, model_name):
    from faster_whisper import WhisperModel
    if not hasattr(transcribe_local, "model"):
        transcribe_local.model = WhisperModel(
            model_name, device="cpu", compute_type="int8",
            cpu_threads=os.cpu_count() or 4)
    segments, _info = transcribe_local.model.transcribe(
        str(path), language="en", beam_size=1, vad_filter=True)
    return " ".join(s.text.strip() for s in segments)


def transcribe_openai(path):
    """OpenAI API backend. Files over 25 MB are split by ffmpeg first."""
    import subprocess
    key = os.environ["OPENAI_API_KEY"]
    chunks = [path]
    if path.stat().st_size > 24_000_000:
        chunk_dir = path.parent / "chunks"
        chunk_dir.mkdir(exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path),
             "-f", "segment", "-segment_time", "1200", "-c", "copy",
             str(chunk_dir / "part%03d.mp3")],
            check=True)
        chunks = sorted(chunk_dir.glob("part*.mp3"))
    texts = []
    for c in chunks:
        import mimetypes
        boundary = "----ctb" + os.urandom(8).hex()
        body = b""
        for name, val in [("model", "whisper-1"), ("language", "en")]:
            body += (f"--{boundary}\r\nContent-Disposition: form-data; "
                     f'name="{name}"\r\n\r\n{val}\r\n').encode()
        body += (f"--{boundary}\r\nContent-Disposition: form-data; "
                 f'name="file"; filename="{c.name}"\r\n'
                 f"Content-Type: audio/mpeg\r\n\r\n").encode()
        body += c.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(
            "https://api.openai.com/v1/audio/transcriptions", data=body,
            headers={"Authorization": f"Bearer {key}",
                     "Content-Type": f"multipart/form-data; boundary={boundary}"})
        with urllib.request.urlopen(req, timeout=600) as r:
            texts.append(json.load(r)["text"])
    return " ".join(texts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=1, help="episodes this run")
    ap.add_argument("--order", choices=["newest", "oldest", "shortest"], default="newest")
    ap.add_argument("--model", default="base.en", help="faster-whisper model")
    ap.add_argument("--openai", action="store_true", help="use OpenAI API (needs OPENAI_API_KEY)")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    todo = missing_episodes(args.order)
    print(f"{len(todo)} episodes lack transcripts; doing {min(args.limit, len(todo))} ({args.order} first)")

    for e in todo[:args.limit]:
        t0 = time.time()
        print(f"ep {e['n']:4d} · {e['date']} · {e['title'][:60]} ({e['duration'] // 60}m)", flush=True)
        with tempfile.TemporaryDirectory() as tmp:
            audio = Path(tmp) / "audio.mp3"
            download_audio(e["audio"], audio)
            print(f"  downloaded {audio.stat().st_size >> 20} MB", flush=True)
            if args.openai:
                text = transcribe_openai(audio)
                model = "openai-whisper-1"
            else:
                text = transcribe_local(audio, args.model)
                model = f"faster-whisper/{args.model}"
        (OUT / f"ep{e['n']:04d}.json").write_text(json.dumps({
            "n": e["n"], "title": e["title"], "date": e["date"],
            "model": model, "text": text,
        }))
        mins = (time.time() - t0) / 60
        rtf = e["duration"] / max(1, time.time() - t0)
        print(f"  done in {mins:.1f} min ({rtf:.1f}x realtime, {len(text.split())} words)", flush=True)

    print("run build_data.py to fold new transcripts into the site data")


if __name__ == "__main__":
    main()
