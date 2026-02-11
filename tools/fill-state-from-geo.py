#!/usr/bin/env python3
import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DATA_PATH = Path("src/data/stations-gr.json")
DEFAULT_PROGRESS_PATH = Path("tools/state-geo-progress.json")
USER_AGENT = "Mozilla/5.0 (compatible; E-RadioBot/1.0; +https://e-radio.github.io)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

ADDRESS_PRIORITY = (
    "city",
    "town",
    "village",
    "municipality",
    "county",
    "city_district",
    "suburb",
    "state_district",
    "state",
    "region",
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


def pick_state_from_address(address: dict) -> str | None:
    for key in ADDRESS_PRIORITY:
        value = address.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Fill station state from geo coordinates via reverse geocoding.")
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
        help="Overwrite existing state values (default: only fill missing)",
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
                has_state = station.get("state") not in (None, "")
                if not args.overwrite and has_state:
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
            state = pick_state_from_address(address)
            if not state:
                print("No suitable address field found. No changes made.")
                skipped.add(target.get("stationuuid"))
                args.progress_file.write_text(
                    json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                continue

            target["state"] = state
            DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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
