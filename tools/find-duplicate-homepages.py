#!/usr/bin/env python3
"""Create a review file for stations that share the same homepage."""

import argparse
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit


DEFAULT_INPUT = Path("src/data/stations-gr.json")
DEFAULT_OUTPUT = Path("src/data/duplicate-homepages-review.json")


def normalize_homepage(value):
    """Return a comparison key while preserving the original URL in output."""
    if not isinstance(value, str) or not value.strip():
        return None

    raw = value.strip()
    parsed = urlsplit(raw if "://" in raw else "//" + raw)
    host = (parsed.hostname or "").lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    if not host:
        return None

    port = parsed.port
    if port and port not in (80, 443):
        host = "{}:{}".format(host, port)

    path = unquote(parsed.path or "/")
    path = "/" + "/".join(part for part in path.split("/") if part)
    if path == "/":
        path = ""

    # Scheme, www, trailing slash, query parameters, and fragments do not
    # distinguish homepages for this manual duplicate review.
    return host + path.lower()


def main():
    parser = argparse.ArgumentParser(
        description="Find stations with the same homepage and export their full metadata for review."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Station JSON file")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Review JSON file")
    args = parser.parse_args()

    if not args.input.exists():
        parser.error("Input file not found: {}".format(args.input))

    stations = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(stations, list):
        parser.error("Input JSON must contain a list of stations")

    grouped = defaultdict(list)
    for station in stations:
        if not isinstance(station, dict):
            continue
        key = normalize_homepage(station.get("homepage"))
        if key:
            grouped[key].append(station)

    review = []
    for key, matches in grouped.items():
        if len(matches) < 2:
            continue
        review.append(
            {
                "homepage_key": key,
                "homepage_urls": sorted(
                    set(station.get("homepage", "") for station in matches),
                    key=str.lower,
                ),
                "station_count": len(matches),
                "stations": sorted(matches, key=lambda station: station.get("name", "").lower()),
            }
        )

    review.sort(key=lambda group: (-group["station_count"], group["homepage_key"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(review, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    station_count = sum(group["station_count"] for group in review)
    print("Found {} shared homepages covering {} stations.".format(len(review), station_count))
    print("Review file: {}".format(args.output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
