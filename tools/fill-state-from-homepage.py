#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

DATA_PATH = Path("src/data/stations-gr.json")
DEFAULT_PROGRESS_PATH = Path("tools/state-fill-progress.json")
USER_AGENT = "Mozilla/5.0 (compatible; E-RadioBot/1.0; +https://e-radio.github.io)"


def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=20) as resp:
        content_type = resp.headers.get("Content-Type", "")
        if not any(token in content_type for token in ("text/html", "application/xhtml+xml", "application/json", "text/plain")):
            raise ValueError(f"Unsupported content-type: {content_type}")
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read(1024 * 1024).decode(charset, errors="ignore")


def extract_jsonld_blocks(html: str):
    blocks = re.findall(
        r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    parsed = []
    for block in blocks:
        cleaned = block.strip()
        if not cleaned:
            continue
        try:
            parsed.append(json.loads(cleaned))
        except json.JSONDecodeError:
            # Some pages include multiple JSON objects in one script tag
            for candidate in re.split(r"\n(?=\s*\{)", cleaned):
                candidate = candidate.strip()
                if not candidate:
                    continue
                try:
                    parsed.append(json.loads(candidate))
                except json.JSONDecodeError:
                    continue
    return parsed


def iter_jsonld_objects(payload):
    if isinstance(payload, list):
        for item in payload:
            yield from iter_jsonld_objects(item)
    elif isinstance(payload, dict):
        if "@graph" in payload and isinstance(payload["@graph"], list):
            for item in payload["@graph"]:
                yield from iter_jsonld_objects(item)
        else:
            yield payload
    else:
        return


def pick_state_from_jsonld(objects):
    for obj in objects:
        address = obj.get("address")
        if isinstance(address, dict):
            for key in ("addressLocality", "addressRegion", "addressArea"):
                value = address.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        area = obj.get("areaServed") or obj.get("contentLocation") or obj.get("location")
        if isinstance(area, dict):
            name = area.get("name")
            if isinstance(name, str) and name.strip():
                return name.strip()
        if isinstance(area, str) and area.strip():
            return area.strip()
    return None


def main():
    parser = argparse.ArgumentParser(description="Fill missing station state from homepage JSON-LD.")
    parser.add_argument("--max", type=int, default=0, help="Max stations to process in one run (0 = no limit)")
    parser.add_argument("--sleep", type=float, default=0.0, help="Seconds to sleep between stations (default: 0)")
    parser.add_argument(
        "--progress-file",
        type=Path,
        default=DEFAULT_PROGRESS_PATH,
        help="Path to progress file for skipped stations",
    )
    args = parser.parse_args()

    if not DATA_PATH.exists():
        print(f"Data file not found: {DATA_PATH}")
        return 1

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    processed = 0
    max_items = args.max if args.max and args.max > 0 else float("inf")

    skipped = set()
    if args.progress_file.exists():
        try:
            skipped = set(json.loads(args.progress_file.read_text(encoding="utf-8")))
        except Exception:
            skipped = set()

    try:
        while processed < max_items:
            target = None
            for station in data:
                if station.get("state") in (None, "") and station.get("stationuuid") not in skipped:
                    target = station
                    break

            if not target:
                if skipped:
                    print("No more unprocessed stations with state: null found.")
                else:
                    print("No stations with state: null found.")
                return 0

            homepage = (target.get("homepage") or "").strip()
            if not homepage:
                print(f"Missing homepage for station: {target.get('name')} ({target.get('stationuuid')})")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                continue

            print(f"Checking: {target.get('name')} ({target.get('stationuuid')})")
            print(f"Homepage: {homepage}")

            try:
                html = fetch_html(homepage)
            except Exception as exc:
                print(f"Failed to fetch homepage: {exc}")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                continue

            jsonld = extract_jsonld_blocks(html)
            state = pick_state_from_jsonld(iter_jsonld_objects(jsonld))

            if not state:
                print("No state found in application/ld+json. No changes made.")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                continue

            target["state"] = state
            DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"✓ Updated state to: {state}")
            processed += 1

            if args.sleep > 0 and processed < max_items:
                time.sleep(args.sleep)
    except KeyboardInterrupt:
        print("Interrupted. Progress saved.")
        args.progress_file.write_text(json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return 130

    return 0


if __name__ == "__main__":
    sys.exit(main())
