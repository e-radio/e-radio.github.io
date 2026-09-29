# Station merge and image cleanup preferences

- After merging station records, remove images made unused by that merge. Check
  references across every country's station data and shared site content first;
  never delete an image still used by another station or page.
- `python3 tools/clean-unused-images.py` previews unused images across all
  countries. Review `reports/unused-images-preview.json`; `--write` removes them
  and records the deletions in `reports/unused-images.json`.
- Historical import/review reports do not count as live image references. Keep
  dynamically selected assets, including localized guide covers.
- Preserve unique streams and per-stream metadata, merged UUIDs and slug aliases,
  direct redirects to the retained station, and existing JSON field order.
