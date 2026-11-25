# Pillows catalogue - Amsterdam review prototype

The complete React prototype for reviewing the catalogue with the hotel team. This project is separate from the learning project at `/home/chris/projects/pillows-catalogue`.

## Run and check

```bash
nvm use
npm ci
npm run dev -- --port 5174
npm test
npm run build
```

For the GitHub Pages repository path, build with `npm run build -- --base=/pillows-inventory/`. Keep asset references relative or use `import.meta.env.BASE_URL` so the same app works locally and under that path.

## Amsterdam drawing provenance

Amsterdam opens on the ground floor. Its map is a simplified trace of eight supplied Office Winhov construction drawings for Pillows MK61, dated 2020-2022:

| Level | Drawing | Revision date | Numbered guest rooms |
| --- | --- | --- | ---: |
| Basement | 2200 UO 018 | 2022-05-19 | 0 |
| Lower ground | 2200 UO 019 | 2022-05-19 | 13 |
| Ground floor | 2200 UO 020 | 2022-01-26 | 27 |
| Mezzanine | 2200 UO 020E | 2021-07-08 | 7 |
| First floor | 2200 UO 021 | 2021-09-15 | 15 |
| Second floor | 2200 UO 022 | 2022-05-19 | 23 |
| Third floor | 2200 UO 023 | 2022-04-20 | 3 |
| Roof | 2200 UO 024 | 2020-10-08 | 0 |

The 88 numbered guest rooms are a count derived from these drawings, not a verified current hotel inventory. Room numbers are preserved independently of floor names, including gaps in the numbering. Guest-room envelopes include their bathrooms; furniture, bathroom partitions, dimensions and technical annotations are omitted from the simplified map.

Corridors, stairs, lifts and labelled service spaces follow the drawings. Unlabelled spaces and unresolved source annotations carry review notes rather than invented specifications. Roof zones describe the drawn surfaces and provide context; they do not imply occupied rooms, guest access or accessible terraces. The original source PDFs are not included in the public application bundle.

The hotel team should confirm current boundaries, uses and operational names against the supplied drawing revisions. Other hotels still use illustrative layouts.

## Demonstration data

Amsterdam's spaces are drawing-based, but products, suppliers, equipment quantities, paint assignments, issues, history and photos remain examples. The interior inventory has not been imported. Drawing floor area is stored separately from painted wall area and must never be substituted for it.

Edits and added photos are session-only demonstration data, not shared hotel records. Appearance preferences are stored on the device. Account scopes and logout demonstrate the intended interface; Django authentication, server-enforced permissions and persistent storage are not implemented.

## Code organisation

- `src/App.jsx` assembles providers and the current screen. `src/app/` owns shared state, navigation and preferences.
- `src/pages/`, `src/components/` and `src/changes/` hold screens, reused controls and editing forms. `src/media/` handles optional photos.
- `src/data/amsterdam-{lower,ground,upper}.json` holds traced geometry and source metadata. `src/data/amsterdam.js` adapts it into map shapes, hotel levels and sample space records. `amsterdam-display.json` contains generated presentation outlines; it does not replace the original traces.
- `src/data/fixtures.js` supplies the remaining sample data. `src/data/inventory.js` owns inventory changes and totals, with its checks alongside it.
- `src/map/` provides the shared renderer, camera and draggable minimap. Hotel geometry is data; interaction code is reused across floors. The three stylesheets cover shared styling, catalogue screens and floor plans.

When updating a drawing, change its geometry data and provenance together, preserve stable space IDs where the same physical space remains, and retain uncertainty notes. Review the simplified shape against the source, then run the build and inventory checks. Check floor switching, search, individual-space opening and selection totals before publishing a new review version.

## Regenerating map outlines

After editing the traced geometry, run from the repository root:

```bash
python3 -m venv .venv-map
.venv-map/bin/pip install Shapely==2.1.2
.venv-map/bin/python scripts/generate-map-display.py
.venv-map/bin/python scripts/generate-map-display.py --check
```

Python and Shapely are needed only when regenerating these data, never by the browser or deployment. Commit the generated `src/data/amsterdam-display.json` with the trace changes; `npm test` detects stale source data. The generator joins narrow partition gaps, adds a consistent six-coordinate-unit display perimeter, and normalises enclosed lift/shaft gaps where there is room to do so. Lower roofs remain context. Edge-adjacent shafts retain their source holes to avoid cutting narrow corridors. This is a visual simplification, not a wall-thickness measurement; source room boundaries and recorded areas remain unchanged.

## Publishing

This standalone prototype is published from `main` in
https://github.com/CASMulder2003/pillows-inventory. The original learning project
is separate and is not modified by this repository.

The Pages workflow uses the pinned Node version and lockfile, runs the tests,
builds with `/pillows-inventory/` as its base path, and publishes the `dist/`
artifact. In repository Settings > Pages, the source must be GitHub Actions.
The expected address after a successful deployment is
https://casmulder2003.github.io/pillows-inventory/.

Run `npm test` and `npm run build -- --base=/pillows-inventory/` before pushing.
To undo a published change, revert its commit and push the revert; avoid force
pushing. The repository and demo are public. Do not add original architectural
PDFs, interior schedules, personal details or real supplier contact information.

The static demo has no shared database or real account authentication. Its
changes and uploaded photos last only for the current browser session.
