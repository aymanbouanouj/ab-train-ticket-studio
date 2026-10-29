# AB TRAIN — Ticket Studio

[Live demo](https://aymanbouanouj.github.io/ab-train-ticket-studio/) · [Deployment checks](https://github.com/aymanbouanouj/ab-train-ticket-studio/actions/workflows/deploy-pages.yml)

AB TRAIN is an independent, browser-local railway booking demonstration by Ayman Bounaouj. It is not affiliated with ONCF and does not issue official reservations, take payments or provide live railway prices, schedules or availability. Every exported ticket is clearly marked SAMPLE / NOT VALID FOR TRAVEL in the selected language.

AB TRAIN is an independent demonstration project. It does not provide official ONCF bookings, live schedules or official fares.

**Licensing:** Original AB TRAIN software is licensed under [GNU AGPL v3.0 only](LICENSE); original AB TRAIN branding and separately identified artwork remain **All Rights Reserved**. External photographs, icons, geographic datasets and dependencies retain their own terms. See [Copyright & licensing scope](COPYRIGHT.md) and [Third-party notices](THIRD_PARTY_NOTICES.md). AGPL permits reuse and modification under its conditions, including commercial use; it is not a no-copy license.

## Requirements and setup

Use Node.js 22.12 or later; Node.js 24 is used for verification. Open a terminal in the project directory:

~~~sh
npm ci
npm run dev
~~~

Open the local URL printed by Vite, normally http://127.0.0.1:5173. This module-based application needs a local server; opening index.html directly is unsupported.

~~~sh
npm run build
npm run preview
~~~

The production output is generated in dist/. The preview normally uses http://127.0.0.1:4173. Neither command publishes or deploys the site. Different browser origins, including different ports, have separate local ticket histories.

## Booking workflow and coverage

1. Choose From and To from the existing **22 registered, serviceable passenger-station records**. Opening a selected field or clearing its search displays all 22 in stable registry order. Typing filters only those stations using their names and aliases, including French, Spanish and Arabic names and accent-insensitive matching.
2. Cities, villages, neighbourhoods and administrative areas are not selectable booking options. A city name may match associated registered stations; an unmatched locality shows a localized No matching stations message. Typed text alone never creates a station or completes a selection.
3. Select a date, a supported simulated service, travel class, coach and available seat.
4. Enter passenger details, review, acknowledge the sample-ticket status and confirm.
5. Reopen saved tickets, show their QR details, download PNG/PDF or print them.

The existing Atlas, Northern, Coastal and Airport corridors use deterministic demo schedules, fares and availability. A selectable station pair is not a promise of a direct service. Explicit connections represent separate simulated bookings. Airport services can arrive on the next day, which is included in their ticket/QR data. No real train is reserved.

The registry is deliberately limited to 22 application records; it is neither a complete nor a live inventory of Moroccan passenger stations. Registry serviceability is based on dated source evidence, not a fresh live-service guarantee.

## Languages, themes and accessibility

English is the default language; French, Spanish and Arabic are supported. Arabic uses RTL where appropriate. Light is the default site theme; light/dark and language preferences persist when browser storage is available. The paper ticket keeps its own appearance in both site themes.

Station selectors retain keyboard ArrowUp/ArrowDown/Enter/Escape behavior, focus indicators and localized screen-reader announcements. The interface supports mobile and desktop layouts and reduced-motion preferences.

## Local privacy and sample tickets

No account, payment information, identity document, email address or phone number is requested by the booking flow. The passenger name and demo booking details are saved in this browser under ab-train-bookings-v1. Language/theme preferences use separate local keys. Clearing browser data can remove ticket history; there is no server backup.

**QR codes, PNG/PDF exports and printouts contain the passenger name and booking details in readable form.** Share them only intentionally and use synthetic names for demonstrations. QR codes are not signed railway credentials. Do not commit browser storage, real passenger tickets, screenshots or exported ticket files.

The application uses locally served assets/data and does not automatically request external runtime services. Owner profile links are intentional external navigation. Public profile configuration lives in src/site-config.js; optional contact fields remain empty unless deliberately configured.

## Architecture and tests

The application uses vanilla ES modules, native HTML/CSS and Vite. Core behavior is in app.js and src/. Geographic source records are separate from station eligibility and booking logic. Ticket generation is shared by preview, PNG, raster PDF and print. Imported public assets are local, including the approved AB TRAIN branding.

~~~sh
npm test
npx playwright install chromium
npm run test:e2e
~~~

npm test runs the unit suite. The existing browser suite contains 39 tests across eight specification files. test:e2e builds and starts an isolated local preview; keep port 4173 free. Browser binaries are a separate Playwright prerequisite. Generated results, screenshots and builds are ignored.

The suite covers booking, station search, unsupported routes, seats, persistence, QR decoding, PNG/PDF/print, four languages, RTL, both themes and responsive layouts. The 39-test suite previously passed on the original application; the isolated candidate run was incomplete because of ENOSPC and is not reported as passing. Deployment runs unit tests and a production build; live verification is a limited smoke check. Physical printer devices/dialogs and live railway operations are not tested.

## Data provenance and asset notices

See [Geographic data provenance](docs/GEOGRAPHIC-DATA-PROVENANCE.md) for source dates, entity distinctions, attribution and limits.

- GeoNames populated-place data is attributed and used under CC BY 4.0; the 46,879 retained records are geographic entities, not booking stations.
- HCP-derived urban classifications and factual source records retain source/page references and modification notices. Raw HCP PDF/workbook downloads are not part of this publication candidate.
- ONCF source URLs, dates and factual station references are retained; cached timetable PDFs are not redistributed in this candidate and no official ONCF timings or fares are imported into bookings.
- [Photo credits](public/fidelity/credits.html) and [machine-readable credits](public/fidelity/image-credits.json) retain author, source, license and change notices for the four destination photos.
- [Social-icon provenance](public/icons/README.md) and the existing [Simple Icons license notice](public/icons/SIMPLE-ICONS-LICENSE.md) remain intact. Copyright licensing does not waive trademark rules.
- [Brand provenance](public/brand/approved/README.md) documents the authoritative AB TRAIN production assets. Required Logo-Pack production inputs and the canonical master remain included.

See [Publication provenance](docs/PUBLICATION-PROVENANCE.md) for the owner assertion covering original AB TRAIN artwork and decorative strips. The third-party Beacons raster is excluded; its profile remains a text link. Third-party photo and icon notices remain applicable.

**Software license:** [GNU Affero General Public License v3.0 only (AGPL-3.0-only)](LICENSE) for original software source, tests and build scripts. This is an open-source copyleft license: compliant copying, modification, redistribution and commercial use are allowed. **Separate original brand/logo/artwork rights:** Copyright © 2026 Ayman Bounaouj. All rights reserved; these independent assets are not offered under the software license. See [COPYRIGHT.md](COPYRIGHT.md) for the explicit scope and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for external licenses and attributions. No project-wide relicense of third-party content is implied.

## Included maintenance tools

- node scripts/integrate-brand.mjs reproduces approved runtime branding from the included production inputs.
- node scripts/audit-location-index.mjs writes a local data-audit output from included source records.
- node scripts/import-geography.mjs refreshes geographic JSON only after separately downloading the GeoNames Morocco dump as data/MA.txt. It must not be run as an automatic publication/build step.

Data regeneration requires a separate review of sources, entity identity, coverage and privacy. Ordinary install/build/tests do not need raw HCP/ONCF downloads, historical implementation kits, private audit reports or recovery snapshots. Those are intentionally outside this candidate.
