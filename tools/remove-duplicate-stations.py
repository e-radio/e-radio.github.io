#!/usr/bin/env python3
import json
import re
from pathlib import Path

DATA_PATH = Path("src/data/stations-gr.json")
ICONS_DIR = Path("public/station-icons")

slug_suffix_re = re.compile(r"-[a-z0-9]{6,8}$", re.IGNORECASE)


def score_station(station: dict) -> int:
    slug = (station.get("slug") or "").strip()
    name = (station.get("name") or "").strip()
    score = 0
    if slug and not slug_suffix_re.search(slug):
        score += 10
    if name:
        score += 1
    return score


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Missing data file: {DATA_PATH}")

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    by_url: dict[str, list[dict]] = {}

    for station in data:
        url = (station.get("stream_url") or "").strip()
        if not url:
            by_url.setdefault("__no_stream__", []).append(station)
            continue
        by_url.setdefault(url, []).append(station)

    removed: list[dict] = []
    kept_ids: set[str] = set()

    for url, stations in by_url.items():
        if len(stations) == 1:
            kept_ids.add(stations[0].get("stationuuid"))
            continue

        stations_sorted = sorted(
            stations,
            key=lambda s: (-score_station(s), len((s.get("slug") or "")), (s.get("slug") or "")),
        )
        keeper = stations_sorted[0]
        kept_ids.add(keeper.get("stationuuid"))
        removed.extend(stations_sorted[1:])

    final_data = [s for s in data if s.get("stationuuid") in kept_ids]

    DATA_PATH.write_text(json.dumps(final_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    referenced = set()
    for s in final_data:
        fav = s.get("favicon") or ""
        if "/station-icons/" in fav:
            referenced.add(Path(fav).name)

    removed_icons = set()
    for s in removed:
        fav = s.get("favicon") or ""
        if "/station-icons/" in fav:
            name = Path(fav).name
            if name and name not in referenced:
                removed_icons.add(name)

    deleted_files = []
    for name in sorted(removed_icons):
        path = ICONS_DIR / name
        if path.exists():
            path.unlink()
            deleted_files.append(name)

    print(f"Removed duplicate stations: {len(removed)}")
    print(f"Deleted unreferenced station icons: {len(deleted_files)}")
    if deleted_files:
        print("Deleted icons:")
        for name in deleted_files:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
