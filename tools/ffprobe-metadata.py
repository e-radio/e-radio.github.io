#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path


def run_ffprobe(url: str) -> dict:
    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"url": url, "error": result.stderr.strip() or "ffprobe failed"}
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"url": url, "error": "Invalid ffprobe JSON output"}

    return {
        "url": url,
        "format": payload.get("format", {}),
        "streams": payload.get("streams", []),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ffprobe and extract stream metadata as JSON.")
    parser.add_argument("--url", action="append", help="Stream URL (can be repeated)")
    parser.add_argument("--input", type=Path, help="Text file with one URL per line")
    parser.add_argument("--output", type=Path, help="Output JSON file (defaults to stdout)")
    args = parser.parse_args()

    urls = []
    if args.url:
        urls.extend([u.strip() for u in args.url if u.strip()])
    if args.input:
        if not args.input.exists():
            print(f"Input file not found: {args.input}", file=sys.stderr)
            return 1
        urls.extend([line.strip() for line in args.input.read_text(encoding="utf-8").splitlines() if line.strip()])

    if not urls:
        print("No URLs provided. Use --url or --input.", file=sys.stderr)
        return 1

    results = [run_ffprobe(url) for url in urls]

    output_json = json.dumps(results, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(output_json + "\n", encoding="utf-8")
    else:
        print(output_json)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
