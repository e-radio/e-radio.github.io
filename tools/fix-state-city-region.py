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
DEFAULT_PROGRESS_PATH = Path("tools/state-region-progress.json")
USER_AGENT = "Mozilla/5.0 (compatible; E-RadioBot/1.0; +https://e-radio.github.io)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

REGIONS = (
    "Attica",
    "Central Macedonia",
    "West Macedonia",
    "East Macedonia and Thrace",
    "Thessaly",
    "Epirus",
    "Western Greece",
    "Central Greece",
    "Peloponnese",
    "North Aegean",
    "South Aegean",
    "Ionian Islands",
    "Crete",
)

REGION_ALIASES = {
    "Attica": ["attica", "attiki"],
    "Central Macedonia": ["central macedonia"],
    "West Macedonia": ["west macedonia", "western macedonia"],
    "East Macedonia and Thrace": ["east macedonia and thrace", "eastern macedonia and thrace"],
    "Thessaly": ["thessaly", "thessalia"],
    "Epirus": ["epirus", "ipeiros"],
    "Western Greece": ["western greece", "west greece"],
    "Central Greece": ["central greece", "sterea ellada", "steria ellada", "sterea"],
    "Peloponnese": ["peloponnese", "peloponnisos", "peloponnesos"],
    "North Aegean": ["north aegean"],
    "South Aegean": ["south aegean"],
    "Ionian Islands": ["ionian islands", "ionian isles"],
    "Crete": ["crete", "kriti"],
}

CITY_PREFIXES = (
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

CITY_SUFFIXES = (
    " municipality",
    " municipal unit",
    " city",
    " region",
    " prefecture",
    " province",
    " county",
    " district",
)

ADDRESS_FIELDS = ("state", "region", "state_district", "county")


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


def normalize_text(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = re.sub(r"[\s\-_/]+", " ", cleaned)
    cleaned = re.sub(r"\s*\(.*?\)\s*", " ", cleaned)
    return " ".join(cleaned.split())


def clean_city(value: str) -> str:
    cleaned = " ".join(value.strip().split())

    if "," in cleaned:
        cleaned = cleaned.split(",", 1)[0].strip()

    cleaned = re.sub(r"\s*\(.*?\)\s*", " ", cleaned)
    cleaned = " ".join(cleaned.split())

    lower = cleaned.lower()
    for prefix in CITY_PREFIXES:
        if lower.startswith(prefix):
            cleaned = cleaned[len(prefix) :].strip()
            break

    lower = cleaned.lower()
    for suffix in CITY_SUFFIXES:
        if lower.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
            break

    return cleaned


def map_region(address: dict) -> str | None:
    for field in ADDRESS_FIELDS:
        value = address.get(field)
        if not isinstance(value, str) or not value.strip():
            continue
        normalized = normalize_text(value)
        for region, aliases in REGION_ALIASES.items():
            for alias in aliases:
                if alias in normalized:
                    return region
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Normalize city/state: move city-like state to city and set state to one of 13 Greece regions."
        )
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
        for station in data:
            if processed >= max_items:
                break
            station_id = station.get("stationuuid")
            if station_id in skipped:
                continue

            state_value = station.get("state")
            state_is_region = isinstance(state_value, str) and state_value in REGIONS
            city_value = station.get("city")

            lat = station.get("geo_lat")
            lon = station.get("geo_long")
            if lat in (None, "") or lon in (None, ""):
                skipped.add(station_id)
                continue

            print(f"Checking: {station.get('name')} ({station_id})")
            print(f"Geo: {lat}, {lon}")

            try:
                payload = reverse_geocode(float(lat), float(lon), args.lang)
            except Exception as exc:
                print(f"Failed to reverse-geocode: {exc}")
                skipped.add(station_id)
                continue

            address = payload.get("address") or {}
            region = map_region(address)
            if not region:
                print("No region match found. No changes made.")
                skipped.add(station_id)
                continue

            city_candidate = None
            if isinstance(city_value, str) and city_value.strip():
                city_candidate = clean_city(city_value)
            elif isinstance(state_value, str) and state_value.strip() and not state_is_region:
                city_candidate = clean_city(state_value)

            if city_candidate:
                station["city"] = city_candidate

            station["state"] = region
            DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"✓ Updated state to: {region}")
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

    args.progress_file.write_text(
        json.dumps(sorted(skipped), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
