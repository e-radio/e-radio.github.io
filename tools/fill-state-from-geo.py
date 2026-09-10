#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DATA_PATH = Path("src/data/stations-gr.json")
DEFAULT_PROGRESS_PATH = Path("tools/state-geo-progress.json")
USER_AGENT = "Mozilla/5.0 (compatible; RadioDirectoryBot/1.0)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

CITY_PRIORITY = (
    "city",
    "town",
    "village",
    "municipality",
    "county",
    "city_district",
    "suburb",
)

STATE_PRIORITY = (
    "state",
    "state_district",
    "region",
    "county",
    "province",
)

CLEAN_PREFIXES = (
    "municipality of ",
    "municipal unit of ",
    "city of ",
    "region of ",
    "prefecture of ",
    "province of ",
    "county of ",
    "district of ",
    "metropolitan area of ",
)

CLEAN_SUFFIXES = (
    " municipality",
    " municipal unit",
    " city",
    " region",
    " prefecture",
    " province",
    " county",
    " district",
)


def reverse_geocode(lat: float, lon: float, language: str) -> dict:
    query = urlencode(
        {
            "format": "jsonv2",
            "lat": f"{lat:.6f}",
            "lon": f"{lon:.6f}",
            "addressdetails": "1",
            "accept-language": language,
        }
    )
    url = f"{NOMINATIM_URL}?{query}"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=20) as resp:
        content_type = resp.headers.get("Content-Type", "")
        if "application/json" not in content_type:
            raise ValueError(f"Unsupported content-type: {content_type}")
        return json.loads(resp.read(1024 * 1024).decode("utf-8", errors="ignore"))


def clean_name(value: str) -> str:
    cleaned = " ".join(value.strip().split())

    if "," in cleaned:
        cleaned = cleaned.split(",", 1)[0].strip()

    cleaned = re.sub(r"\s*\(.*?\)\s*", " ", cleaned)
    cleaned = " ".join(cleaned.split())

    lower = cleaned.lower()
    for prefix in CLEAN_PREFIXES:
        if lower.startswith(prefix):
            cleaned = cleaned[len(prefix) :].strip()
            break

    lower = cleaned.lower()
    for suffix in CLEAN_SUFFIXES:
        if lower.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
            break

    return cleaned


def pick_from_address(address: dict, keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = address.get(key)
        if isinstance(value, str) and value.strip():
            cleaned = clean_name(value)
            if cleaned:
                return cleaned
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fill station city/state from geo coordinates via reverse geocoding."
    )
    parser.add_argument("--max", type=int, default=0, help="Max stations to process in one run (0 = no limit)")
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Seconds to sleep between requests (default: 1.0 for Nominatim)",
    )
    parser.add_argument(
        "--progress-file",
        type=Path,
        default=DEFAULT_PROGRESS_PATH,
        help="Path to progress file for skipped stations",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing city/state values (default: only fill missing)",
    )
    parser.add_argument(
        "--lang",
        type=str,
        default="en",
        help="Reverse-geocode language (default: en)",
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
                has_city = station.get("city") not in (None, "")
                has_state = station.get("state") not in (None, "")
                needs_city = args.overwrite or not has_city
                needs_state = args.overwrite or not has_state
                if not (needs_city or needs_state):
                    continue
                if station.get("stationuuid") in skipped:
                    continue
                target = station
                break

            if not target:
                print("No more stations to process.")
                return 0

            lat = target.get("geo_lat")
            lon = target.get("geo_long")
            if lat in (None, "") or lon in (None, ""):
                print(f"Missing geo coordinates for station: {target.get('name')} ({target.get('stationuuid')})")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(
                    json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                continue

            print(f"Checking: {target.get('name')} ({target.get('stationuuid')})")
            print(f"Geo: {lat}, {lon}")

            try:
                payload = reverse_geocode(float(lat), float(lon), args.lang)
            except Exception as exc:
                print(f"Failed to reverse-geocode: {exc}")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(
                    json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                continue

            address = payload.get("address") or {}
            city = pick_from_address(address, CITY_PRIORITY) if needs_city else None
            state = pick_from_address(address, STATE_PRIORITY) if needs_state else None

            updated_any = False
            if city:
                target["city"] = city
                updated_any = True
            if state:
                target["state"] = state
                updated_any = True

            if not updated_any:
                print("No suitable address field found. No changes made.")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(
                    json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                continue

            DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            if city and state:
                print(f"✓ Updated city to: {city}")
                print(f"✓ Updated state to: {state}")
            elif city:
                print(f"✓ Updated city to: {city}")
            elif state:
                print(f"✓ Updated state to: {state}")
            processed += 1

            if args.sleep > 0 and processed < max_items:
                time.sleep(args.sleep)
    except KeyboardInterrupt:
        print("Interrupted. Progress saved.")
        args.progress_file.write_text(
            json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return 130

    return 0


if __name__ == "__main__":
    sys.exit(main())
