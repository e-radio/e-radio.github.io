#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

DATA_PATH = Path("src/data/stations-gr.json")
USER_AGENT = "Mozilla/5.0 (compatible; E-RadioBot/1.0; +https://e-radio.github.io)"


def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=20) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="ignore")


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
    if not DATA_PATH.exists():
        print(f"Data file not found: {DATA_PATH}")
        return 1

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    target = None
    for station in data:
        if station.get("state") in (None, ""):
            target = station
            break

    if not target:
        print("No stations with state: null found.")
        return 0

    homepage = (target.get("homepage") or "").strip()
    if not homepage:
        print(f"Missing homepage for station: {target.get('name')} ({target.get('stationuuid')})")
        return 0

    print(f"Checking: {target.get('name')} ({target.get('stationuuid')})")
    print(f"Homepage: {homepage}")

    try:
        html = fetch_html(homepage)
    except Exception as exc:
        print(f"Failed to fetch homepage: {exc}")
        return 0

    jsonld = extract_jsonld_blocks(html)
    state = pick_state_from_jsonld(iter_jsonld_objects(jsonld))

    if not state:
        print("No state found in application/ld+json. No changes made.")
        return 0

    target["state"] = state
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated state to: {state}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
