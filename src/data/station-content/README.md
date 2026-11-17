# Station editorial content

Create a folder named after the station's `stationuuid` in its country dataset.
Add `en.json` and optional translations such as `el.json`. Content is selected
using the page locale, with whole-file English fallback. Stations without a
matching file keep their existing layout. These files affect visible content
only; page titles, meta descriptions and structured data remain unchanged.

```json
{
  "about": ["An original, factual description.", "An optional second paragraph."],
  "programs": [
    { "name": "Show name", "description": "Verified program details." }
  ]
}
```

`about` is an array of plain-text paragraphs. `programs` is optional. Keep the
same structure across translations. Text is rendered as escaped text, not HTML.
Translate section headings in the existing UI dictionaries. When English text
changes, review sibling translations as part of that edit. No automatic
translation or freshness tracking is performed.

Real FM 97.8 references:
- https://www.real.gr/realplayer/ (official station link)
- https://radiofono.gr/live (Athens frequency and news format)
- https://www.e-radio.gr/Real-Fm-978-Athens-i680/live (station profile)

The timetable was supplied by the site editor. Verify changes against a current
station source; older schedules may be out of date.

## Schedules and FAQs

`shared.json` stores one timetable used by every language. Its `schedule` has
`timezone`, `source_url`, and `groups`. Each group has numeric `days` (Sunday = 0,
Monday = 1, through Saturday = 6) and `entries` containing `start`, `end` (24-hour
HH:mm), and `name`. A slot belongs to the calendar day on which it starts; an end
of `00:00` means the end of that day. Presenter and show names are retained in
Greek in both language versions. Day names and table headings follow the page
locale. The supplied Real FM timetable is attributed to LIVE24; its inclusion
is not independent verification that it is current.

Language files can include `faqs`, an array of `{ "question": "…", "answer": "…" }`.
Program highlights and FAQs summarize schedule facts; when editing the shared
timetable, update those summaries in every language too. Times exist once in
the actual timetable but may also appear in these editorial summaries.
