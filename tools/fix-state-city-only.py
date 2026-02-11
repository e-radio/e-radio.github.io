#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

DATA_PATH = Path("src/data/stations-gr.json")
DEFAULT_PROGRESS_PATH = Path("tools/state-city-only-progress.json")
CITY_REGION_MAP_PATH = Path("tools/city-region-map.json")

REGIONS = (
    "Attica",
    "Central Macedonia",
    "Western Macedonia",
    "Eastern Macedonia and Thrace",
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

def normalize_text(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = cleaned.replace("/", " ").replace("-", " ")
    cleaned = " ".join(cleaned.split())
    return cleaned


def load_city_region_map(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(payload, dict):
        return {}
    normalized = {}
    for city, region in payload.items():
        if not isinstance(city, str) or not isinstance(region, str):
            continue
        normalized[normalize_text(city)] = region.strip()
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Fix only the case where state holds a city: move state to city and set state to a region."
        )
    )
    parser.add_argument("--max", type=int, default=0, help="Max stations to process in one run (0 = no limit)")
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

    city_region_map = load_city_region_map(CITY_REGION_MAP_PATH)
    unknown_cities = set()

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
            state_value = station.get("state")
            city_value = station.get("city")
            state_is_region = isinstance(state_value, str) and state_value in REGIONS

            if state_is_region or city_value:
                continue

            if not isinstance(state_value, str) or not state_value.strip():
                continue

            city_lookup = normalize_text(state_value)
            if station_id in skipped and city_lookup not in city_region_map:
                continue

            print(f"Checking: {station.get('name')} ({station_id})")

            city = state_value.strip()
            region = city_region_map.get(city_lookup)
            if not region:
                unknown_cities.add(city)
                skipped.add(station_id)
                continue
            if region not in REGIONS:
                print(f"Invalid region in map for city '{city}': {region}")
                skipped.add(station_id)
                continue

            station["city"] = city
            station["state"] = region
            DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"✓ Updated city to: {station['city']}")
            print(f"✓ Updated state to: {region}")
            processed += 1
            skipped.discard(station_id)
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
    if unknown_cities:
        unknown_path = Path("tools/state-city-only-unknown.json")
        unknown_path.write_text(
            json.dumps(sorted(unknown_cities), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
